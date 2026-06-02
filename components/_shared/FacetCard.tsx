import { useTheme } from "../theme/theme-provider";

export default function FacetCard({
  title,
  children,
  showClear,
  clearAction,
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  showClear?: boolean;
  clearAction?: Function;
}) {
  const {
    theme: { styles },
  } = useTheme();

  return (
    <section className={`bg-white rounded-[10px] p-5 mb-4  ${styles.shadowMd}`}>
      <div className="flex items-center pb-4 ">
        {title && <h2 className="font-bold m-0 text-base">{title}</h2>}
      </div>
      <div>{children}</div>
      {showClear && (
        <div className="mt-2">
          <button
            type="button"
            className="text-sm text-[#006b65] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006b65] rounded"
            onClick={() => clearAction && clearAction()}
          >
            Clear filter
          </button>
        </div>
      )}
    </section>
  );
}
