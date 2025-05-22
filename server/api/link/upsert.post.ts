import { LinkSchema } from '@@/schemas/link'
import { registerSchema } from 'zod-to-openapi'

// Register the LinkSchema for OpenAPI
registerSchema('Link', LinkSchema)

export default eventHandler(async (event) => {
  const link = await readValidatedBody(event, LinkSchema.parse)
  const { caseSensitive } = useRuntimeConfig(event)

  if (!caseSensitive) {
    link.slug = link.slug.toLowerCase()
  }

  const { cloudflare } = event.context
  const { KV } = cloudflare.env

  // Check if link exists
  const existingLink = await KV.get(`link:${link.slug}`, { type: 'json' })

  if (existingLink) {
    // If link exists, return it along with the short link
    const shortLink = `${getRequestProtocol(event)}://${getRequestHost(event)}/${link.slug}`
    return { link: existingLink, shortLink, status: 'existing' }
  }

  // If link doesn't exist, create it
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
  return { link, shortLink, status: 'created' }
})

defineRouteMeta({
  openAPI: {
    description: 'Create a new short link or update an existing one if the slug already exists (upsert behavior).',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Link' }
        }
      }
    },
    responses: {
      '200': { description: 'Link already existed and was returned.' },
      '201': { description: 'Link created successfully.' },
    }
  }
})
