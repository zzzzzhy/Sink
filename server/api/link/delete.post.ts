import { z } from 'zod'
import { registerSchema } from 'zod-to-openapi'

const DeleteLinkSchema = z.object({
  slug: z.string().describe("The slug of the link to delete"),
})
registerSchema('DeleteLinkSchema', DeleteLinkSchema)

export default eventHandler(async (event) => {
  const { previewMode } = useRuntimeConfig(event).public
  if (previewMode) {
    throw createError({
      status: 403,
      statusText: 'Preview mode cannot delete links.',
    })
  }
  const { slug } = await readBody(event)
  if (slug) {
    const { cloudflare } = event.context
    const { KV } = cloudflare.env
    await KV.delete(`link:${slug}`)
  }
})

defineRouteMeta({
  openAPI: {
    description: 'Delete an existing short link.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/DeleteLinkSchema' }
        }
      }
    },
    responses: {
      '200': { description: 'Link deleted successfully.' },
      '403': { description: 'Preview mode cannot delete links.' },
      // Assuming a 404 might be implicitly handled or not explicitly returned by current logic
    }
  }
})
