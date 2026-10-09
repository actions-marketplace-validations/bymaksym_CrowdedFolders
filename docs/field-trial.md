<!-- Written by tooling/field-trial.mjs --docs. Do not edit: run it again. -->

# The field trial

crowded-folders was run over 30 public repositories, one or more per preset, to choose its limits
and to find what it reports that it should not. Only the list of file names was downloaded
(`git ls-tree` on a clone without blobs); the commit of each is below, so the trial can be repeated.

**How to read it.** A folder is measured after `recommended` leaves out what is not yours to arrange
(vendored code, test data, media, translations, tool folders). A _module_ is a file with its
companions (`foo.ts`, `foo.spec.ts`, `foo.html` are one). p50/p90/p95/p99 are percentiles of modules
per folder; the last two columns count the problems found with `recommended` alone and with the
repository's own presets.

**What it decided.** Across these repositories the median 95th percentile is 20 modules: a limit of
20 flags about the biggest folder in twenty in a typical project, and none at all in small, tidy ones
(ripgrep, httpx, axum). Projects that keep large flat folders on purpose (git, redis, the Godot engine)
show up as many problems, which is what suppressions are for.

| Repository                                                                                                                                          | Kind                                 | Presets                 | Folders | Modules p50/p90/p95/p99 | Largest | recommended                      | With its presets         |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------- | ------: | ----------------------- | ------: | -------------------------------- | ------------------------ |
| [angular/components](https://github.com/angular/components/tree/c0207b5d84a2903ed846b2ef82698f212bdf0b27)                                           | Angular library                      | angular                 |     999 | 1/8/11/17               |      30 | 5 max-files, 11 prefix-groups    | 59 errors, 0 warnings    |
| [excalidraw/excalidraw](https://github.com/excalidraw/excalidraw/tree/4c00f31ddcc20086bac1020428819fe0b9a30bce)                                     | React app                            | react                   |     113 | 3/14/36/60              |      89 | 7 max-files, 4 prefix-groups     | 11 errors, 0 warnings    |
| [shadcn-ui/taxonomy](https://github.com/shadcn-ui/taxonomy/tree/298a8857c7128a0d121e7f699dfd729f23b3966d)                                           | Next.js app                          | nextjs                  |      44 | 1/5/12/37               |      37 | 2 max-files, 1 prefix-groups     | 3 errors, 0 warnings     |
| [elk-zone/elk](https://github.com/elk-zone/elk/tree/60dc01af98327b431d0eba6dc1cd4c979d080d0f)                                                       | Nuxt app                             | vue                     |      91 | 3/12/21/43              |      43 | 3 max-files, 0 prefix-groups     | 0 errors, 0 warnings     |
| [sveltejs/kit](https://github.com/sveltejs/kit/tree/a06817e90049f15465eca140a07c5218d439dc37)                                                       | SvelteKit                            | svelte                  |    1401 | 1/3/4/8                 |      25 | 2 max-files, 2 prefix-groups     | 4 errors, 0 warnings     |
| [brocoders/nestjs-boilerplate](https://github.com/brocoders/nestjs-boilerplate/tree/9620f159eefe38f47747d02ab162852367c5472c)                       | NestJS app                           | nestjs                  |     105 | 1/4/6/13                |      22 | 0 max-files, 0 prefix-groups     | 0 errors, 0 warnings     |
| [encode/httpx](https://github.com/encode/httpx/tree/b5addb64f0161ff6bfe94c124ef76f6a1fba5254)                                                       | Python library                       | python                  |      11 | 9/18/18/18              |      18 | 0 max-files, 0 prefix-groups     | 0 errors, 0 warnings     |
| [zulip/zulip](https://github.com/zulip/zulip/tree/de2dbb995b7072a169320f522b2571587ac271a7)                                                         | Django app                           | django                  |     425 | 4/16/29/180             |     395 | 30 max-files, 99 prefix-groups   | 120 errors, 0 warnings   |
| [gin-gonic/gin](https://github.com/gin-gonic/gin/tree/43fe48e8a0f44af783116cdb010725e6bb50255f)                                                     | Go library                           | go                      |       9 | 3/49/49/49              |      49 | 2 max-files, 2 prefix-groups     | 0 errors, 0 warnings     |
| [gohugoio/hugo](https://github.com/gohugoio/hugo/tree/f44c355e5915e61ccb3a7cf91cdebb3a0767cbe7)                                                     | Go application                       | go                      |     354 | 3/14/23/59              |     158 | 21 max-files, 17 prefix-groups   | 9 errors, 14 warnings    |
| [BurntSushi/ripgrep](https://github.com/BurntSushi/ripgrep/tree/3fce3b5bb0236da2df6d99672afb8a719642eca7)                                           | Rust CLI                             | rust                    |      56 | 3/8/10/14               |      14 | 0 max-files, 0 prefix-groups     | 0 errors, 0 warnings     |
| [tokio-rs/axum](https://github.com/tokio-rs/axum/tree/618496288c41da835683ec149432c4869722779f)                                                     | Rust library                         | rust                    |     173 | 1/6/9/20                |      46 | 1 max-files, 5 prefix-groups     | 0 errors, 0 warnings     |
| [spring-projects/spring-petclinic](https://github.com/spring-projects/spring-petclinic/tree/500158f732419217507c7656904b8e6aa1bcc0d6)               | Spring app                           | java                    |      28 | 3/8/11/12               |      12 | 0 max-files, 1 prefix-groups     | 1 errors, 0 warnings     |
| [android/nowinandroid](https://github.com/android/nowinandroid/tree/a49ed253d75e61a2b6ab80a8da677b57437b08eb)                                       | Android app                          | android                 |     224 | 1/4/6/13                |      16 | 0 max-files, 1 prefix-groups     | 1 errors, 0 warnings     |
| [dotnet/eShop](https://github.com/dotnet/eShop/tree/dc7ea499cd356924fb6689b3702964a5869dbae9)                                                       | .NET app                             | dotnet                  |     228 | 2/6/8/14                |      18 | 0 max-files, 8 prefix-groups     | 8 errors, 0 warnings     |
| [jellyfin/jellyfin](https://github.com/jellyfin/jellyfin/tree/a45d1415d4da7c9b69d6e7a6895fc63d2d68e8f1)                                             | .NET server                          | dotnet                  |     470 | 2/12/20/47              |     105 | 19 max-files, 39 prefix-groups   | 51 errors, 0 warnings    |
| [Alamofire/Alamofire](https://github.com/Alamofire/Alamofire/tree/bda9ed57d72988a3a2ada33d824583541f86eac6)                                         | Swift library                        | swift                   |     107 | 1/18/25/35              |      46 | 7 max-files, 10 prefix-groups    | 16 errors, 0 warnings    |
| [immich-app/immich](https://github.com/immich-app/immich/tree/116a9436ad1f8164d9dee904551e5067d724be99)                                             | Monorepo: Flutter, NestJS, SvelteKit | flutter, nestjs, svelte |     495 | 2/11/22/57              |      89 | 29 max-files, 17 prefix-groups   | 32 errors, 0 warnings    |
| [mastodon/mastodon](https://github.com/mastodon/mastodon/tree/a773f3b48f30260e68c6df408ee8809d7899b753)                                             | Rails app                            | rails, react            |     696 | 2/15/25/77              |     136 | 41 max-files, 53 prefix-groups   | 34 errors, 46 warnings   |
| [koel/koel](https://github.com/koel/koel/tree/c9ec4fb1931f9de71bdaa6cb7aa65d0f18a9041c)                                                             | Laravel app                          | php, vue                |     352 | 3/14/24/51              |      65 | 20 max-files, 18 prefix-groups   | 26 errors, 0 warnings    |
| [redis/redis](https://github.com/redis/redis/tree/12b9b9e1165c912aaa5226373abb5c2d29f9e6f6)                                                         | C server                             | c-cpp                   |      85 | 4/48/64/465             |     465 | 14 max-files, 39 prefix-groups   | 8 errors, 24 warnings    |
| [git/git](https://github.com/git/git/tree/6de20f6092dcf9bdb1c8efe03db4b70c82b423dd)                                                                 | C tool                               | c-cpp                   |     204 | 3/19/42/281             |    1125 | 19 max-files, 61 prefix-groups   | 19 errors, 55 warnings   |
| [UnityTechnologies/open-project-1](https://github.com/UnityTechnologies/open-project-1/tree/608eac98df29cd97821a6115cd52dfb9027345b1)               | Unity game                           | unity                   |     579 | 4/14/19/32              |      68 | 24 max-files, 40 prefix-groups   | 6 errors, 1 warnings     |
| [tomlooman/ActionRoguelike](https://github.com/tomlooman/ActionRoguelike/tree/b3f0f4269957d6e2c305396669a4eb89f4310e10)                             | Unreal game                          | unreal                  |     116 | 6/42/69/163             |     267 | 20 max-files, 56 prefix-groups   | 3 errors, 10 warnings    |
| [godotengine/godot-demo-projects](https://github.com/godotengine/godot-demo-projects/tree/b761b4cd5718a7118f2c95eb55f181d0a5f004f1)                 | Godot demos                          | godot                   |     414 | 4/9/11/20               |      47 | 3 max-files, 33 prefix-groups    | 3 errors, 1 warnings     |
| [godotengine/godot](https://github.com/godotengine/godot/tree/65e8d16951d6963cb3984c090e45f40d1ba5f704)                                             | C++ engine                           | c-cpp                   |    1013 | 3/21/32/78              |     833 | 105 max-files, 204 prefix-groups | 105 errors, 138 warnings |
| [terraform-aws-modules/terraform-aws-eks](https://github.com/terraform-aws-modules/terraform-aws-eks/tree/91b8a8d944e3cf169483108acd12d5b1e47856f7) | Terraform module                     | terraform               |      28 | 6/9/9/13                |      13 | 0 max-files, 6 prefix-groups     | 0 errors, 6 warnings     |
| [facebook/docusaurus](https://github.com/facebook/docusaurus/tree/26d988c76b1d2b2005dfde4063be807491d601d8)                                         | Docs site and tool                   | docs, react             |     861 | 2/7/14/18               |      29 | 3 max-files, 6 prefix-groups     | 5 errors, 0 warnings     |
| [fastai/fastbook](https://github.com/fastai/fastbook/tree/4aefe0a9050d9894255a878c7d72c04458d60de8)                                                 | Notebooks                            | data-science            |       5 | 20/40/40/40             |      40 | 1 max-files, 2 prefix-groups     | 3 errors, 0 warnings     |
| [exacity/deeplearningbook-chinese](https://github.com/exacity/deeplearningbook-chinese/tree/a03e98d2298528a13779f9fc4c8e7f8c1bd204f7)               | LaTeX book                           | latex                   |      30 | 3/14/14/20              |      20 | 0 max-files, 0 prefix-groups     | 0 errors, 0 warnings     |

## What the trial changed

Each of these was a false positive in an earlier run, and is now a rule of the tool:

- **Media, translations, test data and tool folders are left out by `recommended`.** A folder of icons,
  a `locales/` folder with one file per language, `__snapshots__`, screenshot goldens and
  `.github/workflows` (GitHub does not read sub-folders there) are crowded by design, not by neglect.
- **A group that repeats the name of its folder, or of a folder above it, is not reported.**
  `ColorPicker/ColorInput`, `drag-drop/drag-handle` and `BardHare/BardHare_Idle` are already where
  they belong.
- **A group that is the whole folder is not reported**: moving everything one level down only adds a
  level.
- **Accessor and predicate words do not make groups**: `GetAlbumController`, `IsPlayedComparer` and
  `HasSeries` are not about "get", "is" or "has".
- **Limits count modules, not files**, so an Angular component (four files) weighs what a Go file does.

To repeat it: `pnpm run build && node tooling/field-trial.mjs --docs`.
