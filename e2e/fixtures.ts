import { test as base } from "@playwright/test";
import { AnimeCatalogPage } from "./pages/anime-catalog.page";
import { LoginPage } from "./pages/login.page";
import type { Anime, AnimeInput, CatalogUser, Genre, GenreInput, UserInput } from "../src/types";

const animeItems: Anime[] = [
  {
    id: 1,
    title: "Cowboy Bebop",
    alternateTitle: "カウボーイビバップ",
    genreIds: [1, 2],
    yearAired: 1998,
    releaseCategory: "TV_SERIES",
    episodes: 26,
    season: "Spring 1998",
  },
  {
    id: 2,
    title: "Fullmetal Alchemist",
    alternateTitle: "鋼の錬金術師",
    genreIds: [1],
    yearAired: 2003,
    releaseCategory: "TV_SERIES",
    episodes: 51,
    season: "Fall 2003",
  },
];

const genres: Genre[] = [
  { id: 1, name: "Action" },
  { id: 2, name: "Science Fiction" },
  { id: 3, name: "Adventure" },
  { id: 4, name: "Comedy" },
  { id: 5, name: "Drama" },
  { id: 6, name: "Fantasy" },
  { id: 7, name: "Horror" },
  { id: 8, name: "Mystery" },
  { id: 9, name: "Romance" },
  { id: 10, name: "Sports" },
  { id: 11, name: "Supernatural" },
  { id: 12, name: "Thriller" },
];

const users: CatalogUser[] = [
  { id: 1, name: "Catalog Admin", username: "admin", role: "ADMIN" },
  { id: 2, name: "Standard User", username: "viewer", role: "STANDARD" },
];

type TestFixtures = {
  mockApi: void;
  adminCatalog: AnimeCatalogPage;
  standardCatalog: AnimeCatalogPage;
  loginPage: LoginPage;
};

export const test = base.extend<TestFixtures>({
  mockApi: async ({ page }, use) => {
    const anime = animeItems.map(item => ({ ...item }));
    const genreList = genres.map(item => ({ ...item }));
    const userList = users.map(item => ({ ...item }));

    await page.route("http://localhost:8080/api/**", async route => {
      const request = route.request();
      const url = new URL(request.url());
      const headers = {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "Authorization, Content-Type",
        "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
      };

      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers });
        return;
      }

      if (url.pathname === "/api/auth/login" && request.method() === "POST") {
        const body = request.postDataJSON() as { username: string };
        await route.fulfill({
          headers,
          json: {
            token: "test-token",
            user: {
              id: 1,
              name: body.username === "admin" ? "Catalog Admin" : "Standard User",
              username: body.username,
              role: body.username === "admin" ? "ADMIN" : "STANDARD",
            },
          },
        });
        return;
      }

      const animeId = url.pathname.match(/^\/api\/anime\/(\d+)$/);
      if (url.pathname === "/api/anime" || animeId) {
        if (request.method() === "GET") {
          const search = url.searchParams.get("title")?.toLowerCase() || "";
          await route.fulfill({ headers, json: anime.filter(item => item.title.toLowerCase().includes(search)) });
          return;
        }
        if (request.method() === "POST") {
          const body = request.postDataJSON() as AnimeInput;
          const item: Anime = { ...body, id: Math.max(0, ...anime.map(existing => existing.id)) + 1 };
          anime.push(item);
          await route.fulfill({ headers, json: item });
          return;
        }
        if (request.method() === "PUT" && animeId) {
          const item = anime.find(existing => existing.id === Number(animeId[1]));
          if (!item) {
            await route.fulfill({ status: 404, headers, json: { message: "Anime not found" } });
            return;
          }
          Object.assign(item, request.postDataJSON() as AnimeInput);
          await route.fulfill({ headers, json: item });
          return;
        }
        if (request.method() === "DELETE" && animeId) {
          const index = anime.findIndex(existing => existing.id === Number(animeId[1]));
          if (index < 0) {
            await route.fulfill({ status: 404, headers, json: { message: "Anime not found" } });
            return;
          }
          anime.splice(index, 1);
          await route.fulfill({ status: 204, headers });
          return;
        }
      }

      const genreId = url.pathname.match(/^\/api\/genres\/(\d+)$/);
      if (url.pathname === "/api/genres" || genreId) {
        if (request.method() === "GET") {
          const search = url.searchParams.get("search")?.toLowerCase() || "";
          await route.fulfill({ headers, json: genreList.filter(genre => genre.name.toLowerCase().includes(search)) });
          return;
        }
        if (request.method() === "POST") {
          const body = request.postDataJSON() as GenreInput;
          const item: Genre = { ...body, id: Math.max(0, ...genreList.map(existing => existing.id)) + 1 };
          genreList.push(item);
          await route.fulfill({ headers, json: item });
          return;
        }
        if (request.method() === "PUT" && genreId) {
          const item = genreList.find(existing => existing.id === Number(genreId[1]));
          if (!item) {
            await route.fulfill({ status: 404, headers, json: { message: "Genre not found" } });
            return;
          }
          Object.assign(item, request.postDataJSON() as GenreInput);
          await route.fulfill({ headers, json: item });
          return;
        }
        if (request.method() === "DELETE" && genreId) {
          const index = genreList.findIndex(existing => existing.id === Number(genreId[1]));
          if (index < 0) {
            await route.fulfill({ status: 404, headers, json: { message: "Genre not found" } });
            return;
          }
          genreList.splice(index, 1);
          await route.fulfill({ status: 204, headers });
          return;
        }
      }

      const userId = url.pathname.match(/^\/api\/admin\/users\/(\d+)$/);
      if (url.pathname === "/api/admin/users" || userId) {
        if (request.method() === "GET") {
          const search = url.searchParams.get("search")?.toLowerCase() || "";
          await route.fulfill({ headers, json: userList.filter(user => user.username.toLowerCase().includes(search)) });
          return;
        }
        if (request.method() === "POST") {
          const body = request.postDataJSON() as UserInput;
          const item: CatalogUser = {
            id: Math.max(0, ...userList.map(existing => existing.id)) + 1,
            name: body.name,
            username: body.username,
            role: body.role,
          };
          userList.push(item);
          await route.fulfill({ headers, json: item });
          return;
        }
        if (request.method() === "PUT" && userId) {
          const item = userList.find(existing => existing.id === Number(userId[1]));
          if (!item) {
            await route.fulfill({ status: 404, headers, json: { message: "User not found" } });
            return;
          }
          const body = request.postDataJSON() as UserInput;
          Object.assign(item, { name: body.name, username: body.username, role: body.role });
          await route.fulfill({ headers, json: item });
          return;
        }
        if (request.method() === "DELETE" && userId) {
          const index = userList.findIndex(existing => existing.id === Number(userId[1]));
          if (index < 0) {
            await route.fulfill({ status: 404, headers, json: { message: "User not found" } });
            return;
          }
          userList.splice(index, 1);
          await route.fulfill({ status: 204, headers });
          return;
        }
      }

      await route.fulfill({ status: 404, headers, json: { message: "Unmocked API request" } });
    });

    await use();
  },
  adminCatalog: async ({ page, mockApi }, use) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("anime-catalog-auth", JSON.stringify({
        token: "test-token",
        username: "admin",
        name: "Catalog Admin",
        role: "ADMIN",
      }));
    });
    const catalog = new AnimeCatalogPage(page);
    await catalog.goto();
    await use(catalog);
  },
  standardCatalog: async ({ page, mockApi }, use) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("anime-catalog-auth", JSON.stringify({
        token: "test-token",
        username: "viewer",
        name: "Standard User",
        role: "STANDARD",
      }));
    });
    const catalog = new AnimeCatalogPage(page);
    await catalog.goto();
    await use(catalog);
  },
  loginPage: async ({ page, mockApi }, use) => {
    await use(new LoginPage(page));
  },
});

export { expect } from "@playwright/test";
