import { describe, it, expect } from "vitest"
import { dedent } from "ts-dedent"
import { transformHooksServerJs } from "../transforms/hooks.server.js.js"
import { getTransformConfig } from "./test-helpers/config.js"
import type { TransformConfig } from "../config.js"

describe("transformHooksServerJs", () => {
	describe("basics", () => {
		it("adds handle function to an empty file", () => {
			const code = transformHooksServerJs(getTransformConfig(), "")
			expect(code).toMatchInlineSnapshot(`
				"import { initHandleWrapper } from \\"@inlang/sdk-js/adapter-sveltekit/server\\";

				export const handle = initHandleWrapper({
				    inlangConfigModule: import(\\"../inlang.config.js\\"),
				    getLanguage: () => undefined
				}).wrap((
				  {
				    event: event,
				    resolve: resolve
				  }
				) => resolve(event));"
			`)
		})

		it("adds handle endpoint to a file with arbitrary contents", () => {
			const code = transformHooksServerJs(
				getTransformConfig(),
				dedent`
					import * as Sentry from '@sentry/node';
					import crypto from 'crypto';

					Sentry.init.skip({/*...*/})

					/** @type {import('@sveltejs/kit').HandleServerError} */
					export async function handleError({ error, event }) {
						const errorId = crypto.randomUUID();
						// example integration with https://sentry.io/
						Sentry.captureException(error, { event, errorId });

						return {
							message: 'Whoops!',
							errorId
						};
					}
				`,
			)
			expect(code).toMatchInlineSnapshot(`
				"import { initHandleWrapper } from \\"@inlang/sdk-js/adapter-sveltekit/server\\";
				import * as Sentry from '@sentry/node';
				import crypto from 'crypto';

				Sentry.init.skip({/*...*/})

				/** @type {import('@sveltejs/kit').HandleServerError} */
				export async function handleError({ error, event }) {
					const errorId = crypto.randomUUID();
					// example integration with https://sentry.io/
					Sentry.captureException(error, { event, errorId });

					return {
						message: 'Whoops!',
						errorId
					};
				}

				export const handle = initHandleWrapper({
				    inlangConfigModule: import(\\"../inlang.config.js\\"),
				    getLanguage: () => undefined
				}).wrap((
				    {
				        event: event,
				        resolve: resolve
				    }
				) => resolve(event));"
			`)
		})

		describe("should wrap handle if already defined", () => {
			it("arrow function", () => {
				const code = transformHooksServerJs(
					getTransformConfig(),
					dedent`
						import type { Handle } from '@sveltejs/kit'

						export const handle: Handle = ({ event, resolve }) => {

							event.locals = {
								userId: 123
							}

							return resolve(event)
						}
					`,
				)

				expect(code).toMatchInlineSnapshot(`
					"import { initHandleWrapper } from \\"@inlang/sdk-js/adapter-sveltekit/server\\";
					import type { Handle } from '@sveltejs/kit'

					export const handle = initHandleWrapper({
					    inlangConfigModule: import(\\"../inlang.config.js\\"),
					    getLanguage: () => undefined
					}).wrap(({ event, resolve }) => {

						event.locals = {
							userId: 123
						}

						return resolve(event)
					});"
				`)
			})

			it("function keyword", () => {
				const code = transformHooksServerJs(
					getTransformConfig(),
					dedent`
						export function handle({ event, resolve }) {
							console.log('TADAA!')
							return resolve(event)
						}
					`,
				)

				expect(code).toMatchInlineSnapshot(`
					"import { initHandleWrapper } from \\"@inlang/sdk-js/adapter-sveltekit/server\\";

					export const handle = initHandleWrapper({
					    inlangConfigModule: import(\\"../inlang.config.js\\"),
					    getLanguage: () => undefined
					}).wrap(function handle({ event, resolve }) {
						console.log('TADAA!')
						return resolve(event)
					});"
				`)
			})
		})
	})

	describe("variations", () => {
		it("languageInUrl", () => {
			const code = transformHooksServerJs(getTransformConfig({
				languageInUrl: true,
			}), "")
			expect(code).toMatchInlineSnapshot(`
				"import { replaceLanguageInUrl } from \\"@inlang/sdk-js/adapter-sveltekit/shared\\";
				import { redirect } from \\"@sveltejs/kit\\";
				import { initAcceptLanguageHeaderDetector } from \\"@inlang/sdk-js/detectors/server\\";
				import { initHandleWrapper } from \\"@inlang/sdk-js/adapter-sveltekit/server\\";

				export const handle = initHandleWrapper({
				    inlangConfigModule: import(\\"../inlang.config.js\\"),
				    getLanguage: ({ url }) => url.pathname.split(\\"/\\")[1],
				    initDetectors: ({ request }) => [initAcceptLanguageHeaderDetector(request.headers)],

				    redirect: {
				        throwable: redirect,
				        getPath: ({ url }, language) => replaceLanguageInUrl(url, language),
				    }
				}).wrap((
				  {
				    event: event,
				    resolve: resolve
				  }
				) => resolve(event));"
			`)
		})

		it("languageInUrl and isStatic", () => {
			const code = transformHooksServerJs(getTransformConfig({
				languageInUrl: true,
				isStatic: true,
			}), "")
			expect(code).toMatchInlineSnapshot(`
				"import { initHandleWrapper } from \\"@inlang/sdk-js/adapter-sveltekit/server\\";

				export const handle = initHandleWrapper({
				    inlangConfigModule: import(\\"../inlang.config.js\\"),
				    getLanguage: ({ url }) => url.pathname.split(\\"/\\")[1]
				}).wrap((
				  {
				    event: event,
				    resolve: resolve
				  }
				) => resolve(event));"
			`)
		})

		it("isStatic", () => {
			const code = transformHooksServerJs(getTransformConfig({
				isStatic: true,
			}), "")
			expect(code).toMatchInlineSnapshot(`
				"import { initHandleWrapper } from \\"@inlang/sdk-js/adapter-sveltekit/server\\";

				export const handle = initHandleWrapper({
				    inlangConfigModule: import(\\"../inlang.config.js\\"),
				    getLanguage: () => undefined
				}).wrap((
				  {
				    event: event,
				    resolve: resolve
				  }
				) => resolve(event));"
			`)
		})
	})

	describe.todo("detectors", () => {
		// TODO
	})
})