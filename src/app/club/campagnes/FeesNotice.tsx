import Link from "next/link";
import { formatMoney } from "@/lib/format";

/** Rappel des frais avant le dépôt d'une campagne (plan d'affaires, § 11.2.2). */
export function FeesNotice({ publicationFee }: { publicationFee: number }) {
  return (
    <p className="flash info">
      <b>Frais :</b>{" "}
      {publicationFee > 0 ? (
        <>
          {formatMoney(publicationFee)} d&apos;instruction et de publication, facturés seulement si la campagne est
          publiée (rien si elle est refusée), puis{" "}
        </>
      ) : null}
      5 % des fonds collectés, seulement si l&apos;objectif est atteint.{" "}
      <Link href="/comment-ca-marche#frais">Détail des frais</Link>
    </p>
  );
}
