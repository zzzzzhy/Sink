import { z } from 'zod'
import { registerSchema } from 'zod-to-openapi'

const LinkListQuerySchema = z.object({
  limit: z.coerce.number().int().max(1024).default(20).describe("Number of links to return per page."),
  cursor: z.string().trim().max(1024).optional().describe("Cursor for pagination to get the next set of links.")
});
registerSchema('LinkListQuerySchema', LinkListQuerySchema);

export default eventHandler(async (event) => {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  const { limit, cursor } = await getValidatedQuery(event, LinkListQuerySchema.parse)
  const list = await KV.list({
    prefix: `link:`,
    limit,
    cursor: cursor || undefined,
  })
  if (Array.isArray(list.keys)) {
    list.links = await Promise.all(list.keys.map(async (key: { name: string }) => {
      const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' })
      if (link) {
        return {
          ...metadata,
          ...link,
        }
      }
      return link
    }))
  }
  delete list.keys
  return list
})

defineRouteMeta({
  openAPI: {
    description: 'List all short links with pagination.',
    parameters: [
      {
        in: 'query',
        name: 'limit',
        required: false, 
        schema: { type: 'integer', maximum: 1024, default: 20 },
        description: 'Number of links to return per page.'
      },
      {
        in: 'query',
        name: 'cursor',
        required: false, 
        schema: { type: 'string', maxLength: 1024 },
        description: 'Cursor for pagination to get the next set of links.'
      }
    ],
  }
})
