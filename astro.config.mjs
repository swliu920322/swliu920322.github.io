import { defineConfig } from 'astro/config';
import deno from '@astrojs/deno';
import tailwind from "@astrojs/tailwind";
export default defineConfig({
    integrations: [tailwind()],
    output: 'server',
    adapter: deno(),
});