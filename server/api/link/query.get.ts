export default eventHandler(async (event) => {
  const slug = getQuery(event).slug
  if (slug) {
    const { cloudflare } = event.context
    const { KV } = cloudflare.env
    const { metadata, value: link } = await KV.getWithMetadata(`link:${slug}`, { type: 'json' })
    if (link) {
      return {
        ...metadata,
        ...link,
      }
    }
  }
  throw createError({
    status: 404,
    statusText: 'Not Found',
  })
})

defineRouteMeta({
  openAPI: {
    description: 'Query a specific short link by its slug.',
    parameters: [
      {
        in: 'query',
        name: 'slug',
        required: true,
        schema: { type: 'string' },
        description: 'The slug of the link to query.'
      }
    ],
    responses: {
      '200': { description: 'Link details found.' },
      '404': { description: 'Link not found.' }
    }
  }
})
