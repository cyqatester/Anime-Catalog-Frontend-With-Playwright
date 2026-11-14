import { expect, test } from "./fixtures";

test("admin can sign in and view the anime catalog", async ({ loginPage, page }) => {
  await loginPage.goto();
  await expect(page).toHaveURL(/\/login$/);
  await loginPage.signIn("admin", "password");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Anime catalog" })).toBeVisible();
  await expect(page.getByText("Catalog Admin")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Cowboy Bebop" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add anime" })).toBeVisible();
});

test("admin can paginate the genres table", async ({ adminCatalog, page }) => {
  await adminCatalog.openSection("Genres");

  await expect(page.getByText("Showing 1–10 of 12 genres")).toBeVisible();
  await expect(adminCatalog.animeRow("Romance")).toBeVisible();
  await expect(adminCatalog.animeRow("Supernatural")).toHaveCount(0);

  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByText("Showing 11–12 of 12 genres")).toBeVisible();
  await expect(adminCatalog.animeRow("Supernatural")).toBeVisible();
  await expect(adminCatalog.animeRow("Action")).toHaveCount(0);

  await page.getByRole("button", { name: "Previous" }).click();

  await expect(adminCatalog.animeRow("Action")).toBeVisible();
});

test("admin can search the catalog", async ({ adminCatalog }) => {
  await expect(adminCatalog.animeRow("Fullmetal Alchemist")).toBeVisible();

  await adminCatalog.searchInput.fill("Cowboy");

  await expect(adminCatalog.animeRow("Cowboy Bebop")).toBeVisible();
  await expect(adminCatalog.animeRow("Fullmetal Alchemist")).toHaveCount(0);
});

test("standard users can browse but cannot access management controls", async ({ standardCatalog, page }) => {
  await expect(standardCatalog.heading).toBeVisible();
  await expect(standardCatalog.animeRow("Cowboy Bebop")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add anime" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Genres/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Users/ })).toHaveCount(0);
});

test("admin can view all menu items", async ({ adminCatalog, page }) => {
  await expect(adminCatalog.heading).toBeVisible();
  const navigation = page.getByRole("navigation");

  await expect(navigation.getByRole("button")).toHaveCount(4);
  await expect(navigation.getByRole("button", { name: /^Overview/ })).toBeVisible();
  await expect(navigation.getByRole("button", { name: /^Anime catalog/ })).toBeVisible();
  await expect(navigation.getByRole("button", { name: /^Genres/ })).toBeVisible();
  await expect(navigation.getByRole("button", { name: /^Users/ })).toBeVisible();
});

test("standard user can view only the anime catalog menu item", async ({ standardCatalog, page }) => {
  await expect(standardCatalog.heading).toBeVisible();
  const navigation = page.getByRole("navigation");

  await expect(navigation.getByRole("button")).toHaveCount(1);
  await expect(navigation.getByRole("button", { name: /^Anime catalog/ })).toBeVisible();
  await expect(navigation.getByRole("button", { name: /^Overview/ })).toHaveCount(0);
  await expect(navigation.getByRole("button", { name: /^Genres/ })).toHaveCount(0);
  await expect(navigation.getByRole("button", { name: /^Users/ })).toHaveCount(0);
});

test("admin can add anime", async ({ adminCatalog, page }) => {
  await adminCatalog.addItem();
  await page.getByLabel("Title *", { exact: true }).fill("Trigun");
  await page.getByLabel("Alternate title *", { exact: true }).fill("トライガン");
  await page.getByLabel("Genres *").selectOption(["1"]);
  await page.getByLabel("Year aired *", { exact: true }).fill("1998");
  await page.getByLabel("Release type *").selectOption("TV_SERIES");
  await page.getByLabel("Episodes", { exact: true }).fill("26");
  await page.getByLabel("Season", { exact: true }).fill("Spring 1998");
  await adminCatalog.submitCreate();

  await expect(adminCatalog.animeRow("Trigun")).toBeVisible();
});

test("admin can edit anime", async ({ adminCatalog, page }) => {
  await adminCatalog.editItem(adminCatalog.animeRow("Cowboy Bebop"));
  await page.getByLabel("Title *", { exact: true }).fill("Cowboy Bebop: Revised");
  await adminCatalog.submitUpdate();

  await expect(adminCatalog.animeRow("Cowboy Bebop: Revised")).toBeVisible();
  await expect(adminCatalog.animeRow("Cowboy Bebop")).toHaveCount(0);
});

test("admin can delete anime", async ({ adminCatalog }) => {
  await adminCatalog.deleteItem(adminCatalog.animeRow("Cowboy Bebop"));

  await expect(adminCatalog.animeRow("Cowboy Bebop")).toHaveCount(0);
});

test("admin can add a genre", async ({ adminCatalog, page }) => {
  await adminCatalog.openSection("Genres");
  await adminCatalog.addItem();
  await page.getByLabel("Genre name *").fill("Mecha");
  await adminCatalog.submitCreate();

  await adminCatalog.searchInput.fill("Mecha");
  await expect(adminCatalog.animeRow("Mecha")).toBeVisible();
});

test("admin can edit a genre", async ({ adminCatalog, page }) => {
  await adminCatalog.openSection("Genres");
  await adminCatalog.editItem(adminCatalog.animeRow("Action"));
  await page.getByLabel("Genre name *").fill("Action & Adventure");
  await adminCatalog.submitUpdate();

  await expect(adminCatalog.animeRow("Action & Adventure")).toBeVisible();
  await expect(adminCatalog.animeRow("Action")).toHaveCount(0);
});

test("admin can delete a genre", async ({ adminCatalog }) => {
  await adminCatalog.openSection("Genres");
  await adminCatalog.deleteItem(adminCatalog.animeRow("Science Fiction"));

  await expect(adminCatalog.animeRow("Science Fiction")).toHaveCount(0);
});

test("admin can add a user", async ({ adminCatalog, page }) => {
  await adminCatalog.openSection("Users");
  await adminCatalog.addItem();
  await page.getByLabel("Full name *").fill("New Viewer");
  await page.getByLabel("Username *").fill("new-viewer");
  await page.getByLabel("Password *").fill("password");
  await page.getByLabel("Role").selectOption("STANDARD");
  await adminCatalog.submitCreate();

  await expect(adminCatalog.animeRow("@new-viewer")).toContainText("New Viewer");
});

test("admin can edit a user", async ({ adminCatalog, page }) => {
  await adminCatalog.openSection("Users");
  await adminCatalog.editItem(adminCatalog.animeRow("@viewer"));
  await page.getByLabel("Full name *").fill("Updated Viewer");
  await page.getByLabel("Username *").fill("updated-viewer");
  await adminCatalog.submitUpdate();

  await expect(adminCatalog.animeRow("@updated-viewer")).toContainText("Updated Viewer");
  await expect(adminCatalog.animeRow("@viewer")).toHaveCount(0);
});

test("admin can delete a user", async ({ adminCatalog }) => {
  await adminCatalog.openSection("Users");
  await adminCatalog.deleteItem(adminCatalog.animeRow("@viewer"));

  await expect(adminCatalog.animeRow("@viewer")).toHaveCount(0);
});
