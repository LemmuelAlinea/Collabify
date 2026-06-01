import { z } from 'zod'

export const validationDecisionSchema = z.object({
  decision: z.enum(['accepted_suggestions', 'ignored_suggestions', 'reanalyzed']),
})
