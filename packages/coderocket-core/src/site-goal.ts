import type { SiteGoal, SiteSourceBlueprint } from './site-document'

/** Infer the most useful default visitor action from bounded visible source content. */
export function inferSiteGoal(blueprint: SiteSourceBlueprint): SiteGoal {
  const searchableContent = [
    blueprint.title,
    blueprint.description,
    blueprint.brandName,
    ...blueprint.navigation.flatMap(item => [item.label, item.href]),
    ...blueprint.sections.flatMap(section => [
      section.heading,
      section.body,
      ...section.links.flatMap(link => [link.label, link.href])
    ])
  ]
    .join(' ')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (
    /\b(appointment|book|booking|calendly|calendar|rendez-vous|reservation|reserve|reserver)\b/.test(
      searchableContent
    )
  )
    return 'booking'
  if (
    /\b(acheter|boutique|buy|cart|checkout|commander|panier|product|shop|store)\b/.test(
      searchableContent
    )
  )
    return 'sell'
  if (/\b(appel|call|contact|devis|estimate|quote)\b/.test(searchableContent)) return 'contact'
  return 'present'
}
