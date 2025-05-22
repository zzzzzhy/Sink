import { LinkSchema } from '@@/schemas/link'
import { registerSchema } from 'zod-to-openapi'

// Register the LinkSchema for OpenAPI
const LinkOpenAPISchema = registerSchema('Link', LinkSchema)

export default eventHandler(async (event) => {
  const link = await readValidatedBody(event, LinkSchema.parse)

  const { caseSensitive } = useRuntimeConfig(event)

  if (!caseSensitive) {
    link.slug = link.slug.toLowerCase()
  }

  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  const existingLink = await KV.get(`link:${link.slug}`)
  if (existingLink) {
    throw createError({
      status: 409, // Conflict
      statusText: 'Link already exists',
    })
  }

  else {
    const expiration = getExpiration(event, link.expiration)

    await KV.put(`link:${link.slug}`, JSON.stringify(link), {
      expiration,
      metadata: {
        expiration,
        url: link.url,
        comment: link.comment,
      },
    })
    setResponseStatus(event, 201)
    const shortLink = `${getRequestProtocol(event)}://${getRequestHost(event)}/${link.slug}`
    return { link, shortLink }
  }
})

defineRouteMeta({
  openAPI: {
    description: 'Create a new short link.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Link' }
          // Alternatively, using the registered schema directly:
          // schema: LinkOpenAPISchema
        }
      }
    },
    responses: {
      '201': {
        description: 'Link created successfully.',
        // TODO: Define response structure for 201 if needed
      },
      '409': {
        description: 'Link already exists.'
      }
    }
  }
})
