import { useEffect, useState } from "react";
import type * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity, AlertCircle, ArrowDownUp, BookOpen, Check, ChevronDown, CircleHelp,
  Clapperboard, Command, Database, Film, LayoutDashboard, LogOut, Menu, MoreHorizontal,
  Pencil, Plus, Search, Settings, ShieldCheck, Tags, Trash2, Users, X,
} from "lucide-react";
import { animeApi, authApi, clearSession, getStoredSession, genreApi, saveSession, userApi } from "./api";
import type { AuthSession } from "./api";
import type { Anime, AnimeInput, CatalogUser, Genre, GenreInput, UserInput } from "./types";

type Section = "overview" | "anime" | "genres" | "users";
type ModalState = { kind: "anime" | "genre" | "user"; item?: Anime | Genre | CatalogUser } | null;

const categoryLabel: Record<string, string> = {
  TV_SERIES: "TV Series", OVA: "OVA", MOVIE: "Movie",
};

function errorMessage(error: unknown) {
  const e = error as { response?: { data?: { message?: string; error?: string } }; message?: string };
  return e.response?.data?.message || e.response?.data?.error || e.message || "Something went wrong.";
}

function App() {
  const [session, setSession] = useState(() => getStoredSession());
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [section, setSection] = useState<Section>("anime");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState("");
  const qc = useQueryClient();
  const isAdmin = session?.role === "ADMIN";

  function navigate(path: string, replace = false) {
    if (window.location.pathname !== path) {
      window.history[replace ? "replaceState" : "pushState"](null, "", path);
    }
    setPathname(path);
  }

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const destination = session ? "/dashboard" : "/login";
    if (pathname !== destination) navigate(destination, true);
  }, [pathname, session]);

  const animeQ = useQuery({ queryKey: ["anime", search], queryFn: () => animeApi.list(search), enabled: !!session });
  // Genres are read-only lookup data used to display anime genre names for both roles.
  const genresQ = useQuery({ queryKey: ["genres", section === "genres" ? search : "lookup"], queryFn: () => genreApi.list(section === "genres" ? search : ""), enabled: !!session });
  const usersQ = useQuery({ queryKey: ["users", search], queryFn: () => userApi.list(search), enabled: !!session && isAdmin });
  const anime = animeQ.data || [];
  const genres = genresQ.data || [];
  const users = usersQ.data || [];
  const activeQuery = section === "anime" ? animeQ : section === "genres" ? genresQ : usersQ;

  useEffect(() => {
    if (!isAdmin && section !== "anime") setSection("anime");
  }, [isAdmin, section]);

  const deleteMutation = useMutation({
    mutationFn: async ({ kind, id }: { kind: string; id: number }) => {
      if (!isAdmin) throw new Error("Only ADMIN users can manage catalog data.");
      if (kind === "anime") return animeApi.remove(id);
      if (kind === "genre") return genreApi.remove(id);
      return userApi.remove(id);
    },
    onSuccess: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: ["anime"] }), qc.invalidateQueries({ queryKey: ["genres"] }), qc.invalidateQueries({ queryKey: ["users"] })]);
      setNotice("Item deleted successfully.");
      window.setTimeout(() => setNotice(""), 3000);
    },
  });

  if (!session) return <LoginPage onLogin={(next) => { saveSession(next); setSession(next); setSection("anime"); qc.clear(); navigate("/dashboard"); }} />;

  const navItems = [
    ...(isAdmin ? [{ id: "overview" as const, label: "Overview", icon: LayoutDashboard }] : []),
    { id: "anime" as const, label: "Anime catalog", icon: Clapperboard, count: anime.length },
    ...(isAdmin ? [
      { id: "genres" as const, label: "Genres", icon: Tags, count: genres.length },
      { id: "users" as const, label: "Users", icon: Users, count: users.length },
    ] : []),
  ];
  const title = section === "overview" ? "Overview" : section === "anime" ? "Anime catalog" : section === "genres" ? "Genres" : "User management";

  function openCreate() {
    if (!isAdmin) return;
    setModal({ kind: section === "genres" ? "genre" : section === "users" ? "user" : "anime" });
  }
  function confirmDelete(kind: string, item: Anime | Genre | CatalogUser) {
    if (!isAdmin) return;
    // const label = "title" in item ? item.title : "name" in item ? item.name : item.username;
    const label = "title" in item ? item.title : "username" in item ? item.username : item.name;
    if (window.confirm(`Delete “${label}”? This action cannot be undone.`)) deleteMutation.mutate({ kind, id: item.id });
  }
  function logout() {
    clearSession(); setSession(null); setModal(null); setSearch(""); setSection("anime"); qc.clear(); navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><Film size={21} /></div><div><strong>ANIME<span>CATALOG</span></strong><small>{isAdmin ? "ADMIN CONSOLE" : "CATALOG VIEWER"}</small></div><button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18} /></button></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list">{navItems.map(({ id, label, icon: Icon, count }) => (
          <button key={id} className={`nav-item ${section === id ? "active" : ""}`} onClick={() => { setSection(id); setSearch(""); setMobileNav(false); }}><Icon size={18} /><span>{label}</span>{count !== undefined && <small>{count}</small>}</button>
        ))}</nav>
        <div className="sidebar-bottom"><div className="connection-card"><span className="connection-dot" /><div><b>API connection</b><small>Spring Boot · REST</small></div></div><div className="sidebar-foot"><ShieldCheck size={15} /> Signed in · {session.role}</div></div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="breadcrumbs">Workspace <span>/</span> <b>{title}</b></div>
          <div className="top-actions"><div className="account-chip"><div className="avatar">{(session.name[0] || session.username[0] || "U").toUpperCase()}</div><div className="account-meta"><b>{session.name}</b><small>{session.role}</small></div></div><button className="logout-button" onClick={logout}><LogOut size={15} /> Sign out</button></div>
        </header>
        <div className="page-content">
          {notice && <div className="toast"><Check size={16} />{notice}</div>}
          {section === "overview" && isAdmin ? <Overview anime={anime} genres={genres} users={users} loading={animeQ.isLoading || genresQ.isLoading || usersQ.isLoading} onNavigate={setSection} /> : <>
            <div className="page-heading"><div><div className="eyebrow">{isAdmin ? "CATALOG MANAGEMENT" : "ANIME COLLECTION"}</div><h1>{title}</h1><p>{isAdmin ? (section === "anime" ? "Manage titles, release details, and genre assignments." : section === "genres" ? "Organize the genres available across your catalog." : "Manage accounts and access roles.") : "Browse and search the anime catalog."}</p></div>
              {isAdmin && <button className="primary-button" onClick={openCreate}><Plus size={17} /> {section === "anime" ? "Add anime" : section === "genres" ? "Add genre" : "Add user"}</button>}
            </div>
            <div className="toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${section}...`} /></div><div className="result-count">{activeQuery.isLoading ? "Loading…" : `${activeQuery.data?.length ?? 0} results`}</div></div>
            {activeQuery.isLoading ? <Loading /> : activeQuery.isError ? <ErrorPanel message={errorMessage(activeQuery.error)} onRetry={() => activeQuery.refetch()} /> : (
              section === "anime" ? <AnimeTable items={anime} genres={genres} readOnly={!isAdmin} onEdit={item => isAdmin && setModal({ kind: "anime", item })} onDelete={item => confirmDelete("anime", item)} /> :
                section === "genres" && isAdmin ? <GenreTable items={genres} onEdit={item => setModal({ kind: "genre", item })} onDelete={item => confirmDelete("genre", item)} /> :
                  section === "users" && isAdmin ? <UserTable items={users} onEdit={item => setModal({ kind: "user", item })} onDelete={item => confirmDelete("user", item)} /> : null
            )}
          </>}
        </div>
      </main>
      {modal && isAdmin && <EditorModal state={modal} genres={genres} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await Promise.all([qc.invalidateQueries({ queryKey: ["anime"] }), qc.invalidateQueries({ queryKey: ["genres"] }), qc.invalidateQueries({ queryKey: ["users"] })]); setNotice("Changes saved successfully."); window.setTimeout(() => setNotice(""), 3000); }} />}
      {deleteMutation.isError && <div className="toast error-toast"><AlertCircle size={16} />{errorMessage(deleteMutation.error)}</div>}
      {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close menu" />}
    </div>
  );
}

function LoginPage({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setBusy(true);
    try { const result = await authApi.login(username.trim(), password); onLogin(result); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  return <div className="login-screen"><div className="login-card"><div className="login-brand"><div className="brand-mark"><Film size={22} /></div><div><strong>ANIME<span>CATALOG</span></strong><small>VERSION 1.0 BY CYQATESTER</small></div></div><div className="login-heading"><div className="eyebrow">WELCOME BACK</div><h1>Sign in</h1><p>Sign in with your Anime Catalog account to continue.</p></div><form onSubmit={submit} className="login-form"><label className="field"><span>Username</span><input autoComplete="username" required value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" /></label><label className="field"><span>Password</span><input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" /></label>{error && <div className="form-error"><AlertCircle size={15} />{error}</div>}<button className="primary-button login-submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form><div className="login-foot"><ShieldCheck size={14} /> Access is based on your assigned account role.</div></div></div>;
}
function Overview({ anime, genres, users, loading, onNavigate }: { anime: Anime[]; genres: Genre[]; users: CatalogUser[]; loading: boolean; onNavigate: (s: Section) => void }) {
  const tv = anime.filter(a => a.releaseCategory === "TV_SERIES").length;
  const movies = anime.filter(a => a.releaseCategory === "MOVIE").length;
  return <div>
    <div className="page-heading overview-heading"><div><div className="eyebrow">YOUR WORKSPACE</div><h1>Good day, admin <span>✦</span></h1><p>Here’s what’s happening in your anime catalog.</p></div><div className="date-chip"><Activity size={15} /> Live API data</div></div>
    {loading ? <Loading /> : <div className="stats-grid">
      <Stat icon={Clapperboard} label="Total anime" value={anime.length} detail={`${tv} TV series`} tone="violet" />
      <Stat icon={Tags} label="Genres" value={genres.length} detail="Catalog categories" tone="blue" />
      <Stat icon={Users} label="Users" value={users.length} detail="Registered accounts" tone="green" />
      <Stat icon={Film} label="Movies" value={movies} detail="Feature-length titles" tone="orange" />
    </div>}
    <div className="overview-grid">
      <section className="panel recent-panel">
        <div className="panel-heading"><div><h2>Recently in your catalog</h2><p>Your anime collection at a glance</p></div><button className="text-button" onClick={() => onNavigate("anime")}>View all <ArrowDownUp size={14} /></button></div>
        {loading ? <Loading /> : anime.length ? <div className="recent-list">{anime.slice(0, 5).map(item => <div className="recent-row" key={item.id}><div className="poster-placeholder"><Clapperboard size={18} /></div><div className="recent-info"><b>{item.title}</b><small>{item.alternateTitle || "No alternate title"}</small></div><span className="pill">{categoryLabel[item.releaseCategory] || item.releaseCategory}</span><span className="year">{item.yearAired}</span></div>)}</div> : <Empty title="Your catalog is empty" text="Add your first anime to get started." />}
      </section>
      <section className="panel quick-panel">
        <div className="panel-heading"><div><h2>Quick actions</h2><p>Jump into common tasks</p></div></div>
        <button className="quick-action" onClick={() => onNavigate("anime")}><span className="quick-icon violet"><Clapperboard size={18} /></span><span><b>Manage anime</b><small>Add, edit, or remove titles</small></span><span className="quick-arrow">→</span></button>
        <button className="quick-action" onClick={() => onNavigate("genres")}><span className="quick-icon blue"><Tags size={18} /></span><span><b>Manage genres</b><small>Organize catalog categories</small></span><span className="quick-arrow">→</span></button>
        <button className="quick-action" onClick={() => onNavigate("users")}><span className="quick-icon green"><Users size={18} /></span><span><b>Manage users</b><small>Review accounts and roles</small></span><span className="quick-arrow">→</span></button>
        <div className="api-note"><Database size={16} /><span>Data is loaded directly from your Spring Boot REST API.</span></div>
      </section>
    </div>
    <div className="tip-banner"><CircleHelp size={18} /><div><b>Getting started</b><p>Use the sidebar to manage anime, genres, and user accounts. Changes are saved to your existing backend.</p></div></div>
  </div>;
}

function Stat({ icon: Icon, label, value, detail, tone }: { icon: React.ElementType; label: string; value: number; detail: string; tone: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19} /></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>;
}

function TableShell({ children, empty, title }: { children: React.ReactNode; empty: boolean; title: string }) {
  return <div className="table-card">{empty ? <Empty title={`No ${title} found`} text="Try changing your search or add a new item." /> : <div className="table-scroll"><table>{children}</table></div>}</div>;
}

function Actions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return <div className="row-actions"><button className="action-button" onClick={onEdit} title="Edit"><Pencil size={15} /></button><button className="action-button danger" onClick={onDelete} title="Delete"><Trash2 size={15} /></button></div>;
}

type AnimeWithGenres = Anime & { genres?: Genre[] };

function AnimeTable({ items, genres, onEdit, onDelete, readOnly = false }: { items: Anime[]; genres: Genre[]; onEdit: (a: Anime) => void; onDelete: (a: Anime) => void; readOnly?: boolean }) {
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Return to the first page when search results or the anime list changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [items]);

  // The backend response uses `genres: [{ id, name }...]`; older request models
  // may still use `genreIds`, so support both shapes.
  const genreNames = (anime: Anime) => {
    const animeWithGenres = anime as AnimeWithGenres;
    if (Array.isArray(animeWithGenres.genres) && animeWithGenres.genres.length) {
      return animeWithGenres.genres.map(g => g.name).filter(Boolean).join(", ") || "—";
    }
    return (anime.genreIds || [])
      .map(id => genres.find(g => Number(g.id) === Number(id))?.name)
      .filter((name): name is string => Boolean(name))
      .join(", ") || "—";
  };

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = items.slice(startIndex, startIndex + PAGE_SIZE);

  return <>
    <TableShell empty={!items.length} title="anime"><thead><tr><th>ANIME TITLE</th><th>GENRES</th><th>YEAR</th><th>TYPE</th><th>EPISODES</th>{!readOnly && <th></th>}</tr></thead><tbody>
      {pageItems.map(a => <tr key={a.id}><td><div className="title-cell"><div className="mini-poster"><Film size={16} /></div><div><b>{a.title}</b><small>{a.alternateTitle}</small></div></div></td><td><span className="muted-cell">{genreNames(a)}</span></td><td>{a.yearAired}</td><td><span className="pill">{categoryLabel[a.releaseCategory] || a.releaseCategory}</span></td><td>{a.episodes ?? "—"}</td>{!readOnly && <td><Actions onEdit={() => onEdit(a)} onDelete={() => onDelete(a)} /></td>}</tr>)}
    </tbody></TableShell>
    {items.length > PAGE_SIZE && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginTop: "16px" }}>
      <span className="muted-cell" style={{ fontSize: "13px" }}>
        Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, items.length)} of {items.length} anime
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        <button type="button" className="secondary-button" disabled={currentPage === 1} onClick={() => setCurrentPage(page => Math.max(1, page - 1))}>Previous</button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
          <button
            key={page}
            type="button"
            className={page === currentPage ? "primary-button" : "secondary-button"}
            aria-current={page === currentPage ? "page" : undefined}
            onClick={() => setCurrentPage(page)}
            style={{ minWidth: "36px", justifyContent: "center" }}
          >
            {page}
          </button>
        ))}
        <button type="button" className="secondary-button" disabled={currentPage === totalPages} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}>Next</button>
      </div>
    </div>}
  </>;
}

function GenreTable({ items, onEdit, onDelete }: { items: Genre[]; onEdit: (g: Genre) => void; onDelete: (g: Genre) => void }) {
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = items.slice(startIndex, startIndex + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [items]);

  return <>
    <TableShell empty={!items.length} title="genres"><thead><tr><th>GENRE</th><th>ID</th><th></th></tr></thead><tbody>{pageItems.map(g => <tr key={g.id}><td><div className="genre-name"><span className="genre-dot" /><b>{g.name}</b></div></td><td>#{g.id}</td><td><Actions onEdit={() => onEdit(g)} onDelete={() => onDelete(g)} /></td></tr>)}</tbody></TableShell>
    {items.length > PAGE_SIZE && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginTop: "16px" }}>
      <span className="muted-cell" style={{ fontSize: "13px" }}>
        Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, items.length)} of {items.length} genres
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        <button type="button" className="secondary-button" disabled={currentPage === 1} onClick={() => setCurrentPage(page => Math.max(1, page - 1))}>Previous</button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
          <button
            key={page}
            type="button"
            className={page === currentPage ? "primary-button" : "secondary-button"}
            aria-current={page === currentPage ? "page" : undefined}
            onClick={() => setCurrentPage(page)}
            style={{ minWidth: "36px", justifyContent: "center" }}
          >
            {page}
          </button>
        ))}
        <button type="button" className="secondary-button" disabled={currentPage === totalPages} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}>Next</button>
      </div>
    </div>}
  </>;
}

function UserTable({ items, onEdit, onDelete }: { items: CatalogUser[]; onEdit: (u: CatalogUser) => void; onDelete: (u: CatalogUser) => void }) {
  return <TableShell empty={!items.length} title="users"><thead><tr><th>USER</th><th>USERNAME</th><th>ROLE</th><th></th></tr></thead><tbody>{items.map(u => <tr key={u.id}><td><div className="user-cell"><div className="user-avatar">{u.name?.[0]?.toUpperCase() || "U"}</div><b>{u.name}</b></div></td><td className="muted-cell">@{u.username}</td><td><span className={`role-pill ${u.role === "ADMIN" ? "admin" : ""}`}>{u.role}</span></td><td><Actions onEdit={() => onEdit(u)} onDelete={() => onDelete(u)} /></td></tr>)}</tbody></TableShell>;
}

function EditorModal({ state, genres, onClose, onSaved }: { state: NonNullable<ModalState>; genres: Genre[]; onClose: () => void; onSaved: () => void }) {
  const editing = Boolean(state.item);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const existingAnime = state.item as AnimeWithGenres | undefined;
  const [anime, setAnime] = useState<AnimeInput>({
    title: existingAnime?.title || "", alternateTitle: existingAnime?.alternateTitle || "",
    genreIds: existingAnime?.genres?.map(g => g.id) ?? existingAnime?.genreIds ?? [], yearAired: existingAnime?.yearAired || new Date().getFullYear(),
    releaseCategory: (state.item as Anime)?.releaseCategory || "TV_SERIES", episodes: (state.item as Anime)?.episodes ?? undefined,
    season: (state.item as Anime)?.season || "",
  });
  const [genre, setGenre] = useState<GenreInput>({ name: (state.item as Genre)?.name || "" });
  const [user, setUser] = useState<UserInput>({
    name: (state.item as CatalogUser)?.name || "", username: (state.item as CatalogUser)?.username || "",
    password: "", role: (state.item as CatalogUser)?.role || "STANDARD",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setFormError(""); setBusy(true);
    try {
      if (state.kind === "anime") {
        if (!anime.title.trim() || !anime.alternateTitle.trim() || !anime.genreIds.length || !anime.yearAired) throw new Error("Complete the required fields and choose at least one genre.");
        const body = { ...anime, episodes: anime.episodes ? Number(anime.episodes) : undefined, yearAired: Number(anime.yearAired) };
        if (editing) await animeApi.update((state.item as Anime).id, body); else await animeApi.create(body);
      } else if (state.kind === "genre") {
        if (!genre.name.trim()) throw new Error("Genre name is required.");
        if (editing) await genreApi.update((state.item as Genre).id, genre); else await genreApi.create(genre);
      } else {
        if (!user.name.trim() || !user.username.trim()) throw new Error("Name and username are required.");
        if (!editing && !user.password) throw new Error("Password is required for a new user.");
        const body = { ...user, password: user.password || undefined };
        if (editing) await userApi.update((state.item as CatalogUser).id, body); else await userApi.create(body);
      }
      onSaved();
    } catch (err) { setFormError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  const heading = `${editing ? "Edit" : "Add"} ${state.kind === "anime" ? "anime" : state.kind === "genre" ? "genre" : "user"}`;
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><form className="modal" onSubmit={submit}>
    <div className="modal-head"><div><div className="eyebrow">CATALOG MANAGEMENT</div><h2>{heading}</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={19} /></button></div>
    <div className="modal-body">
      {state.kind === "anime" && <>
        <Field label="Title *"><input required value={anime.title} onChange={e => setAnime({ ...anime, title: e.target.value })} placeholder="e.g. Cowboy Bebop" /></Field>
        <Field label="Alternate title *"><input required value={anime.alternateTitle} onChange={e => setAnime({ ...anime, alternateTitle: e.target.value })} placeholder="Japanese or alternate title" /></Field>
        <Field label="Genres *"><select multiple value={anime.genreIds.map(String)} onChange={e => setAnime({ ...anime, genreIds: Array.from(e.target.selectedOptions).map(o => Number(o.value)) })}>{genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select><small className="field-hint">Hold Ctrl (Windows) or Cmd (Mac) to select multiple.</small></Field>
        <div className="form-grid"><Field label="Year aired *"><input type="number" required min="1900" max="2100" value={anime.yearAired} onChange={e => setAnime({ ...anime, yearAired: Number(e.target.value) })} /></Field><Field label="Release type *"><select value={anime.releaseCategory} onChange={e => setAnime({ ...anime, releaseCategory: e.target.value as AnimeInput["releaseCategory"] })}><option value="TV_SERIES">TV Series</option><option value="OVA">OVA</option><option value="MOVIE">Movie</option></select></Field></div>
        <div className="form-grid"><Field label="Episodes"><input type="number" min="1" value={anime.episodes ?? ""} onChange={e => setAnime({ ...anime, episodes: e.target.value ? Number(e.target.value) : undefined })} placeholder="Optional" /></Field><Field label="Season"><input value={anime.season || ""} onChange={e => setAnime({ ...anime, season: e.target.value })} placeholder="e.g. Spring 1998" /></Field></div>
      </>}
      {state.kind === "genre" && <Field label="Genre name *"><input required autoFocus value={genre.name} onChange={e => setGenre({ name: e.target.value })} placeholder="e.g. Science Fiction" /></Field>}
      {state.kind === "user" && <>
        <Field label="Full name *"><input required value={user.name} onChange={e => setUser({ ...user, name: e.target.value })} placeholder="Full name" /></Field>
        <Field label="Username *"><input required value={user.username} onChange={e => setUser({ ...user, username: e.target.value })} placeholder="Username" /></Field>
        <Field label={editing ? "New password (leave blank to keep current)" : "Password *"}><input type="password" required={!editing} value={user.password || ""} onChange={e => setUser({ ...user, password: e.target.value })} placeholder="Password" /></Field>
        <Field label="Role"><select value={user.role} onChange={e => setUser({ ...user, role: e.target.value as UserInput["role"] })}><option value="STANDARD">Standard</option><option value="ADMIN">Admin</option></select></Field>
      </>}
      {formError && <div className="form-error"><AlertCircle size={15} />{formError}</div>}
    </div>
    <div className="modal-foot"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create"}</button></div>
  </form></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Loading() { return <div className="loading"><span className="spinner" />Loading your catalog…</div>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="empty-state"><div className="empty-icon"><BookOpen size={22} /></div><b>{title}</b><p>{text}</p></div>; }
function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="error-panel"><AlertCircle size={22} /><b>Could not load data</b><p>{message}</p><p className="error-hint">Check that Spring Boot is running, the API URL is correct, and the acting username exists.</p><button className="secondary-button" onClick={onRetry}>Try again</button></div>; }

export default App;