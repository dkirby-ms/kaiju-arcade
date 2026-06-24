# Versioning Strategy

Kaiju Arcade follows **Semantic Versioning 2.0.0** ([semver.org](https://semver.org/))

## Version Format

```
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]
```

- **MAJOR**: Incompatible API changes, breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

## Version Management

### Automatic Version Bumping

```bash
# Bump patch version (0.1.0 → 0.1.1)
npm run version:patch

# Bump minor version (0.1.0 → 0.2.0)
npm run version:minor

# Bump major version (0.1.0 → 1.0.0)
npm run version:major
```

These commands will:
1. Update `package.json` version
2. Create a Git tag with prefix `v` (e.g., `v0.1.1`)
3. Commit the version change

### Manual Version Updates

```bash
npm version <version>
# e.g. npm version 1.0.0
```

## Version Access in Code

Get the current version programmatically:

```typescript
import { getPackageVersion, getVersionInfo } from "./utils";

const version = getPackageVersion(); // "0.1.0"

const info = getVersionInfo();
// {
//   version: "0.1.0",
//   major: 0,
//   minor: 1,
//   patch: 0,
//   isPrerelease: false
// }
```

## Pre-release Versions

For alpha/beta/rc builds:

```bash
npm version 0.2.0-alpha.1
npm version 0.2.0-beta.1
npm version 0.2.0-rc.1
npm version 0.2.0    # Release version
```

## Release Timeline

- **v0.1.0**: EPIC 1 & 2 (Tier 1 Infrastructure) complete
- **v0.2.0**: EPIC 3-5 (Tier 2 Gameplay) complete
- **v0.3.0**: EPIC 6-8 (Tier 2 Continued) complete
- **v0.4.0**: EPIC 9-12 (Tier 3 Polish & Deploy) complete
- **v1.0.0**: Full production release with all features
