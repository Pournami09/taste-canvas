// Parses the Netscape Bookmark File format that Chrome exports.
// Returns a folder tree. Non-http/https URLs are filtered out.

export type BookmarkItem = {
  title: string;
  url: string;
};

export type BookmarkFolder = {
  name: string;
  items: BookmarkItem[];
  children: BookmarkFolder[];
};

/** Parse a Chrome bookmarks HTML export into a folder tree. */
export function parseBookmarksHtml(html: string): BookmarkFolder {
  if (typeof window === "undefined") {
    return { name: "root", items: [], children: [] };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // The top-level <DL> is the root container
  const rootDl = doc.querySelector("DL");
  if (!rootDl) {
    return { name: "root", items: [], children: [] };
  }

  return parseDl(rootDl, "root");
}

function parseDl(dl: Element, name: string): BookmarkFolder {
  const folder: BookmarkFolder = { name, items: [], children: [] };

  // Direct <DT> children only (not nested ones)
  for (const child of Array.from(dl.children)) {
    if (child.tagName !== "DT") continue;

    const anchor = child.querySelector(":scope > A");
    const heading = child.querySelector(":scope > H3");
    const nestedDl = child.querySelector(":scope > DL");

    if (anchor) {
      const url = anchor.getAttribute("HREF") ?? "";
      if (isValidUrl(url)) {
        folder.items.push({
          title: anchor.textContent?.trim() || urlToTitle(url),
          url,
        });
      }
    } else if (heading && nestedDl) {
      const childFolder = parseDl(nestedDl, heading.textContent?.trim() || "Folder");
      // Only include folders that have at least one valid item (recursively)
      if (hasSomeItems(childFolder)) {
        folder.children.push(childFolder);
      }
    }
  }

  return folder;
}

function isValidUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

function urlToTitle(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function hasSomeItems(folder: BookmarkFolder): boolean {
  if (folder.items.length > 0) return true;
  return folder.children.some(hasSomeItems);
}

/** Flatten all BookmarkItems out of a folder and its descendants. */
export function flattenFolder(folder: BookmarkFolder): BookmarkItem[] {
  return [
    ...folder.items,
    ...folder.children.flatMap(flattenFolder),
  ];
}

/** Count all valid items in a folder and its descendants. */
export function countItems(folder: BookmarkFolder): number {
  return flattenFolder(folder).length;
}
