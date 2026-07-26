const LIFEVER_RELEASES_API =
  "https://api.github.com/repos/badosz0/lifever/releases/latest";
const LIFEVER_RELEASES_URL =
  "https://github.com/badosz0/lifever/releases/latest";

type ParsedVersion = {
  core: [number, number, number];
  prerelease: string[];
};

export type ReleaseUpdate = {
  version: string;
  releaseUrl: string;
  downloadUrl?: string;
};

function parseVersion(value: string): ParsedVersion | null {
  const match = value
    .trim()
    .match(
      /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/,
    );

  if (!match) {
    return null;
  }

  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4]?.split(".") ?? [],
  };
}

function comparePrereleaseIdentifiers(left: string, right: string) {
  const leftNumber = /^\d+$/.test(left) ? Number(left) : null;
  const rightNumber = /^\d+$/.test(right) ? Number(right) : null;

  if (leftNumber !== null && rightNumber !== null) {
    return Math.sign(leftNumber - rightNumber);
  }
  if (leftNumber !== null) {
    return -1;
  }
  if (rightNumber !== null) {
    return 1;
  }

  return left.localeCompare(right);
}

export function compareVersions(left: string, right: string) {
  const parsedLeft = parseVersion(left);
  const parsedRight = parseVersion(right);

  if (!parsedLeft || !parsedRight) {
    return 0;
  }

  for (let index = 0; index < parsedLeft.core.length; index += 1) {
    const difference =
      (parsedLeft.core[index] ?? 0) - (parsedRight.core[index] ?? 0);
    if (difference !== 0) {
      return Math.sign(difference);
    }
  }

  if (parsedLeft.prerelease.length === 0) {
    return parsedRight.prerelease.length === 0 ? 0 : 1;
  }
  if (parsedRight.prerelease.length === 0) {
    return -1;
  }

  const identifierCount = Math.max(
    parsedLeft.prerelease.length,
    parsedRight.prerelease.length,
  );

  for (let index = 0; index < identifierCount; index += 1) {
    const leftIdentifier = parsedLeft.prerelease[index];
    const rightIdentifier = parsedRight.prerelease[index];

    if (leftIdentifier === undefined) {
      return -1;
    }
    if (rightIdentifier === undefined) {
      return 1;
    }

    const difference = comparePrereleaseIdentifiers(
      leftIdentifier,
      rightIdentifier,
    );
    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

function getSafeReleaseUrl(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  try {
    const url = new URL(value);
    const isLifeverRelease =
      url.protocol === "https:" &&
      url.hostname === "github.com" &&
      url.pathname.startsWith("/badosz0/lifever/releases/");

    return isLifeverRelease ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

export async function getLatestRelease(
  signal?: AbortSignal,
): Promise<ReleaseUpdate> {
  const response = await fetch(LIFEVER_RELEASES_API, {
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`GitHub release check failed with ${response.status}`);
  }

  const release = (await response.json()) as {
    assets?: Array<{
      browser_download_url?: unknown;
      name?: unknown;
    }>;
    html_url?: unknown;
    tag_name?: unknown;
  };

  if (typeof release.tag_name !== "string" || !parseVersion(release.tag_name)) {
    throw new Error("GitHub returned an invalid Lifever release version");
  }

  const dmgAsset = release.assets?.find(
    (asset) =>
      typeof asset.name === "string" &&
      asset.name.toLocaleLowerCase().endsWith(".dmg"),
  );
  const releaseUrl = getSafeReleaseUrl(
    release.html_url,
    LIFEVER_RELEASES_URL,
  );
  const downloadUrl = getSafeReleaseUrl(
    dmgAsset?.browser_download_url,
    releaseUrl,
  );

  return {
    version: release.tag_name.replace(/^v/, ""),
    releaseUrl,
    ...(downloadUrl !== releaseUrl ? { downloadUrl } : {}),
  };
}
