import { test, expect, Page } from "@playwright/test";

const CLOUD_PORT = 4174;
const UNCONFIGURED_PORT = 4175;

async function setupVirtualHost(page: Page, targetPort: number) {
  await page.route("https://holidays.example/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const localUrl = `http://127.0.0.1:${targetPort}${url.pathname}${url.search}`;
    try {
      const response = await route.fetch({ url: localUrl });
      await route.fulfill({ response });
    } catch {
      await route.abort();
    }
  });
}

test.describe("Mode Cloud Supabase — 7 cas obligatoires (§5 stack-target.md)", () => {
  test("1. Build cloud servi sur localhost (port 4174) -> app directe en mode local, pas d'AuthScreen", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (
        msg.type() === "error" &&
        !/Download the React DevTools/i.test(msg.text())
      ) {
        errors.push(`console.error: ${msg.text()}`);
      }
    });
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

    // Accès direct au port 4174 sur localhost : l'origine loopback force le mode local
    await page.goto(`http://localhost:${CLOUD_PORT}/`);

    // Vérifie la présence du Header et du badge de stockage local
    const header = page.locator('[data-testid="app-header"]');
    await expect(header).toBeVisible({ timeout: 15_000 });

    const localBadge = page.locator('[data-testid="local-badge"]');
    await expect(localBadge).toBeVisible();
    await expect(localBadge).toContainText("Stockage local");

    // Aucun AuthScreen ne doit être affiché en mode local
    const authScreen = page.locator('[data-testid="auth-screen"]');
    await expect(authScreen).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  test("2. Cloud sans session (sur https://holidays.example) -> AuthScreen seul, aucune donnée affichée", async ({
    page,
  }) => {
    await setupVirtualHost(page, CLOUD_PORT);

    // Mock des appels auth Supabase vers l'URL synthétique pour simuler l'absence de session
    await page.route("https://synthetic.supabase.invalid/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/auth/v1/user") || url.includes("/auth/v1/session")) {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "Unauthorized", message: "No active session" }),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.goto("https://holidays.example/");

    // AuthScreen doit être affiché
    const authScreen = page.locator('[data-testid="auth-screen"]');
    await expect(authScreen).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-testid="auth-email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-submit-button"]')).toBeVisible();

    // Aucune donnée applicative ne doit être rendue
    await expect(page.locator('[data-testid="kpi-cards"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="leave-entries"]')).toHaveCount(0);
  });

  test("3. Validation formulaire sans appel réseau (email/mdp invalides)", async ({
    page,
  }) => {
    await setupVirtualHost(page, CLOUD_PORT);

    let supabaseNetworkCalled = false;
    await page.route("https://synthetic.supabase.invalid/**", async (route) => {
      supabaseNetworkCalled = true;
      await route.abort();
    });

    await page.goto("https://holidays.example/");
    await expect(page.locator('[data-testid="auth-screen"]')).toBeVisible({ timeout: 15_000 });

    // Saisie d'un email invalide et d'un mot de passe trop court
    await page.locator('[data-testid="auth-email-input"]').fill("invalid-email");
    await page.locator('[data-testid="auth-password-input"]').fill("123");

    await page.locator('[data-testid="auth-submit-button"]').click();

    // L'erreur client Zod s'affiche immédiatement
    const errorBanner = page.locator('[data-testid="auth-error-banner"]');
    await expect(errorBanner).toBeVisible();

    // Aucun appel réseau ne doit avoir été initié
    expect(supabaseNetworkCalled).toBe(false);
  });

  test("4. Mauvais mot de passe -> message visible, champs conservés", async ({
    page,
  }) => {
    await setupVirtualHost(page, CLOUD_PORT);

    // Mock renvoyant une erreur invalid_credentials
    await page.route("https://synthetic.supabase.invalid/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/auth/v1/token")) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            code: "invalid_credentials",
            error: "invalid_grant",
            error_description: "Invalid login credentials",
            message: "Invalid login credentials",
          }),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.goto("https://holidays.example/");
    await expect(page.locator('[data-testid="auth-screen"]')).toBeVisible({ timeout: 15_000 });

    const emailInput = page.locator('[data-testid="auth-email-input"]');
    const passwordInput = page.locator('[data-testid="auth-password-input"]');

    await emailInput.fill("user@holidays.test");
    await passwordInput.fill("wrongpassword123");

    await page.locator('[data-testid="auth-submit-button"]').click();

    // Message d'erreur convivial en français visible
    const errorBanner = page.locator('[data-testid="auth-error-banner"]');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText("Adresse e-mail ou mot de passe incorrect.");

    // Conservation stricte des champs saisis
    await expect(emailInput).toHaveValue("user@holidays.test");
    await expect(passwordInput).toHaveValue("wrongpassword123");
  });

  test("5. Connexion réussie -> app affichée, identité dans le Header", async ({
    page,
  }) => {
    await setupVirtualHost(page, CLOUD_PORT);

    const testUser = {
      id: "99999999-9999-9999-9999-999999999999",
      aud: "authenticated",
      role: "authenticated",
      email: "colleague@company.com",
    };

    await page.route("https://synthetic.supabase.invalid/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/auth/v1/token")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            access_token: "mock-access-token",
            token_type: "bearer",
            expires_in: 3600,
            refresh_token: "mock-refresh-token",
            user: testUser,
          }),
        });
        return;
      }
      if (url.includes("/auth/v1/user")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(testUser),
        });
        return;
      }
      if (url.includes("/rest/v1/year_plans")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.goto("https://holidays.example/");
    await expect(page.locator('[data-testid="auth-screen"]')).toBeVisible({ timeout: 15_000 });

    await page.locator('[data-testid="auth-email-input"]').fill("colleague@company.com");
    await page.locator('[data-testid="auth-password-input"]').fill("ValidPassword123!");
    await page.locator('[data-testid="auth-submit-button"]').click();

    // AuthScreen disparaît et laisse place à l'application
    await expect(page.locator('[data-testid="auth-screen"]')).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator('[data-testid="app-header"]')).toBeVisible();

    // Identité utilisateur affichée dans le Header
    const userBadge = page.locator('[data-testid="user-badge"]');
    await expect(userBadge).toBeVisible();
    await expect(userBadge).toContainText("colleague@company.com");

    // Bouton de déconnexion disponible
    await expect(page.locator('[data-testid="sign-out-button"]')).toBeVisible();
  });

  test("6. Déconnexion -> retour à AuthScreen et cache @holidays_* vidé", async ({
    page,
  }) => {
    await setupVirtualHost(page, CLOUD_PORT);

    const testUser = {
      id: "88888888-8888-8888-8888-888888888888",
      aud: "authenticated",
      role: "authenticated",
      email: "logout-test@holidays.test",
    };

    // Pré-remplit le cache local et les tokens auth avant le chargement
    await page.addInitScript(
      ({ user }) => {
        const now = Math.floor(Date.now() / 1000);
        const sessionPayload = {
          access_token: "mock-token",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: now + 3600,
          refresh_token: "mock-refresh",
          user,
        };
        // Clé auth Supabase typique
        window.localStorage.setItem(
          "sb-synthetic-auth-token",
          JSON.stringify(sessionPayload)
        );
        // Données métiers en cache local
        window.localStorage.setItem(
          "@holidays_year_plans_v1",
          JSON.stringify([{ id: "test-plan-2026", year: "2026", entries: [] }])
        );
        window.localStorage.setItem(
          "@holidays_temp_draft",
          JSON.stringify({ draft: true })
        );
        // Clé tierce ne devant pas être purgée
        window.localStorage.setItem("unrelated_third_party_key", "keep-me");
      },
      { user: testUser }
    );

    await page.route("https://synthetic.supabase.invalid/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/auth/v1/token")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            access_token: "mock-token",
            token_type: "bearer",
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            refresh_token: "mock-refresh",
            user: testUser,
          }),
        });
        return;
      }
      if (url.includes("/auth/v1/user") || url.includes("/auth/v1/session")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(testUser),
        });
        return;
      }
      if (url.includes("/auth/v1/logout")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "{}",
        });
        return;
      }
      if (url.includes("/rest/v1/year_plans")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.goto("https://holidays.example/");

    // L'application s'affiche avec la session connectée
    const signOutButton = page.locator('[data-testid="sign-out-button"]');
    await expect(signOutButton).toBeVisible({ timeout: 15_000 });

    // Déconnexion
    await signOutButton.click();

    // Retour immédiat à l'AuthScreen
    const authScreen = page.locator('[data-testid="auth-screen"]');
    await expect(authScreen).toBeVisible({ timeout: 15_000 });

    // Vérifie que toutes les clés @holidays_* ont été purgées du stockage local
    const storageKeys = await page.evaluate(() => {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k) keys.push(k);
      }
      return keys;
    });

    const remainingHolidaysKeys = storageKeys.filter((k) => k.startsWith("@holidays_"));
    expect(remainingHolidaysKeys).toEqual([]);

    // La clé tierce doit être conservée
    expect(storageKeys.includes("unrelated_third_party_key")).toBe(true);
  });

  test("7. Cloud sans clés (port 4175) -> bandeau 'Configuration Supabase requise' et soumission désactivée", async ({
    page,
  }) => {
    await setupVirtualHost(page, UNCONFIGURED_PORT);

    await page.goto("https://holidays.example/");

    // AuthScreen s'affiche
    const authScreen = page.locator('[data-testid="auth-screen"]');
    await expect(authScreen).toBeVisible({ timeout: 15_000 });

    // Le bandeau d'alerte spécifique est affiché
    const warningBanner = page.locator('[data-testid="auth-unconfigured-banner"]');
    await expect(warningBanner).toBeVisible();
    await expect(warningBanner).toContainText("Configuration Supabase requise");

    // Le bouton de soumission est désactivé
    const submitButton = page.locator('[data-testid="auth-submit-button"]');
    await expect(submitButton).toBeDisabled();
  });
});
