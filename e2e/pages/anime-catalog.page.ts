import type { Locator, Page } from "@playwright/test";

export class AnimeCatalogPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/dashboard");
  }

  get heading(): Locator {
    return this.page.getByRole("heading", { name: "Anime catalog" });
  }

  get searchInput(): Locator {
    return this.page.getByPlaceholder(/^Search /);
  }

  async openSection(section: "Anime catalog" | "Genres" | "Users") {
    await this.page.getByRole("navigation").getByRole("button", { name: new RegExp(`^${section}`) }).click();
  }

  async addItem() {
    await this.page.getByRole("button", { name: /^Add / }).click();
  }

  animeRow(title: string): Locator {
    return this.page.getByRole("row").filter({ has: this.page.getByText(title, { exact: true }) });
  }

  async editItem(row: Locator) {
    await row.getByTitle("Edit").click();
  }

  async deleteItem(row: Locator) {
    this.page.once("dialog", dialog => dialog.accept());
    await row.getByTitle("Delete").click();
  }

  async submitCreate() {
    await this.page.getByRole("button", { name: "Create", exact: true }).click();
  }

  async submitUpdate() {
    await this.page.getByRole("button", { name: "Save changes" }).click();
  }
}
