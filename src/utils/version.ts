/**
 * Version Management Utilities
 *
 * Provides helpers for semantic versioning throughout the codebase.
 */

import * as semver from "semver";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Get the current package version from package.json
 */
export function getPackageVersion(): string {
  try {
    const packagePath = join(__dirname, "..", "..", "package.json");
    const pkg = JSON.parse(readFileSync(packagePath, "utf-8"));
    return pkg.version;
  } catch (error) {
    console.warn("Failed to read package version:", error);
    return "0.0.0";
  }
}

/**
 * Validate a semantic version string
 */
export function isValidVersion(version: string): boolean {
  return semver.valid(version) !== null;
}

/**
 * Compare two versions
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
export function compareVersions(
  a: string,
  b: string
): -1 | 0 | 1 {
  if (!isValidVersion(a) || !isValidVersion(b)) {
    throw new Error("Invalid version string");
  }
  return semver.compare(a, b) as -1 | 0 | 1;
}

/**
 * Check if a version satisfies a range
 */
export function satisfiesVersion(version: string, range: string): boolean {
  return semver.satisfies(version, range);
}

/**
 * Increment version
 */
export function incrementVersion(
  version: string,
  type: "major" | "minor" | "patch"
): string {
  const incremented = semver.inc(version, type);
  if (!incremented) {
    throw new Error(`Failed to increment ${type} version: ${version}`);
  }
  return incremented;
}

/**
 * Get version parts
 */
export interface VersionParts {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string[];
}

export function parseVersion(version: string): VersionParts {
  const parsed = semver.parse(version);
  if (!parsed) {
    throw new Error(`Invalid version: ${version}`);
  }
  return {
    major: parsed.major,
    minor: parsed.minor,
    patch: parsed.patch,
    prerelease: parsed.prerelease.length > 0 ? (parsed.prerelease as string[]) : undefined,
  };
}

/**
 * Get the current version for use in API responses, logging, etc.
 */
export function getVersionInfo() {
  const version = getPackageVersion();
  const parts = parseVersion(version);

  return {
    version,
    major: parts.major,
    minor: parts.minor,
    patch: parts.patch,
    isPrerelease: parts.prerelease && parts.prerelease.length > 0,
  };
}
