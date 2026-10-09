import type { Preset } from '../config/types.ts';
import { dataScience } from './content/data-science.ts';
import { docs } from './content/docs.ts';
import { latex } from './content/latex.ts';
import { terraform } from './content/terraform.ts';
import { godot } from './games/godot.ts';
import { unity } from './games/unity.ts';
import { unreal } from './games/unreal.ts';
import { recommended, strict } from './general.ts';
import { cpp } from './languages/c-cpp.ts';
import { dotnet } from './languages/dotnet.ts';
import { flutter } from './languages/flutter.ts';
import { go } from './languages/go.ts';
import { android, java } from './languages/jvm.ts';
import { php } from './languages/php.ts';
import { django, python } from './languages/python.ts';
import { rails } from './languages/rails.ts';
import { rust } from './languages/rust.ts';
import { swift } from './languages/swift.ts';
import { angular } from './web/angular.ts';
import { nestjs } from './web/nestjs.ts';
import { nuxt } from './web/nuxt.ts';
import { nextjs, react, reactNative } from './web/react.ts';
import { svelte } from './web/svelte.ts';
import { vue } from './web/vue.ts';

/**
 * The presets that come with the package, by the name `extends` uses. The order is the order `init`
 * lists them in and the order of docs/presets.md: general first, then by field.
 */
export const BUILT_IN_PRESETS: Readonly<Record<string, Preset>> = {
    recommended,
    strict,
    // Web
    angular,
    react,
    nextjs,
    'react-native': reactNative,
    vue,
    nuxt,
    svelte,
    nestjs,
    // Languages
    python,
    django,
    go,
    rust,
    java,
    android,
    dotnet,
    swift,
    flutter,
    rails,
    php,
    'c-cpp': cpp,
    // Games
    unity,
    unreal,
    godot,
    // Infrastructure, documents and data
    terraform,
    docs,
    'data-science': dataScience,
    latex,
};
