import FableApp from "@/components/fable-app";
import { getWorkspace } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { characters, collections, encounters } = await getWorkspace();
  return (
    <FableApp
      initialCharacters={characters}
      initialCollections={collections}
      initialEncounters={encounters}
    />
  );
}
