export function useTijdSessies() {
  return { projectSessies: [], eigenSessie: null, eigenSessieElders: null, bezig: false, inklokken: async () => null, uitklokken: async () => null, secondenVan: () => 0, isVerlopen: () => false }
}
