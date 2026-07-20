/** Add preview-selection metadata only inside the editable Studio surface. */
export function siteDocumentSelection(
  published: boolean,
  key: string,
  kind: string,
  label: string,
  section?: string
) {
  if (published) return {}
  return {
    'data-cr-select-key': key,
    'data-cr-select-kind': kind,
    'data-cr-select-label': label,
    'data-cr-select-section': section
  }
}
