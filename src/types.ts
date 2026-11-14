export type ReleaseCategory = "TV_SERIES" | "OVA" | "MOVIE";
export type UserRole = "STANDARD" | "ADMIN";

export interface Anime {
  id: number;
  title: string;
  alternateTitle: string;
  genreIds: number[];
  yearAired: number;
  releaseCategory: ReleaseCategory;
  episodes?: number | null;
  season?: string | null;
}

export interface Genre {
  id: number;
  name: string;
}

export interface CatalogUser {
  id: number;
  name: string;
  username: string;
  role: UserRole;
}

export type AnimeInput = Omit<Anime, "id">;
export type GenreInput = Pick<Genre, "name">;
export interface UserInput {
  name: string;
  username: string;
  password?: string;
  role: UserRole;
}
