# Contributing

Thank you for wanting to contribute to AI Shell Desktop. This is a community project — whether you are a regular user, a plugin author, or a developer, there is a way to contribute that fits you.

## Regular users: use, report, and spread the word

- Report problems or odd behavior in an [issue](https://github.com/Alexliwenhao/shell-desktop/issues): include your operating system (macOS / Windows), application version, and reproduction steps.
- Feature ideas and improvement suggestions are welcome as issues too.
- Review pull requests and answer issues in this repository; tutorials and experience posts are welcome too.

## Plugin authors: extend the ecosystem

DSH is built around plugins. If you write plugins, start with:

- [Plugin development](docs/plugin-development.en.md): how to write ordinary DSH plugins and Desktop plugins.
- [DSH plugin ecosystem manifesto](docs/plugin-ecosystem.en.md): our vision of an open, composable, sustainable ecosystem, and the three principles — composition first, declare clearly, compatibility first.

Plugins that follow the manifesto coexist better with other plugins and install and work alongside them more easily.

## Developers: contribute code

### Development environment

```sh
git submodule update --init --recursive
corepack yarn install --immutable
corepack yarn check   # full headless gate: build, typecheck, tests, and smokes
corepack yarn dev     # launch the application when a graphical session is available
```

### Repository boundaries (please read before starting)

- `deepseek-harness/` is the pinned upstream submodule. **Desktop development never edits files inside it**; upstream updates land through separate pin commits.
- Desktop code lives in `shell-desktop/` and `shell-desktop-beta/`; both share the outer Yarn workspace, and shared behavior is protected by the variant-alignment gate.
- Builds, typechecks, unit tests, and smoke checks must stay headless-safe.

### Commits and pull requests

- Use conventional commit messages (for example `fix(desktop): ...`, `docs: ...`).
- Run `yarn check` and keep it green before committing.
- After changing production dependencies, run `yarn workspace shell-desktop verify:notices` to refresh the third-party notices and commit the updated `shell-desktop/THIRD_PARTY_NOTICES.md`.
- Documentation changes should stay bilingual and update the `README.i18n.yaml` hash record.
- Describe the change, its motivation, and how it was verified in the PR; merge after CI passes.

## Code of conduct

Be kind and respectful, and stick to the topic. We want a community that welcomes newcomers. The [Contributor Covenant](CODE_OF_CONDUCT.en.md) applies to all project spaces.
