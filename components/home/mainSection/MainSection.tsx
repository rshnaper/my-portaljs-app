import { Group } from "@portaljs/ckan";
import GroupCard from "../../groups/GroupCard";
import PopularDatasets from "./PopularDatasets";
import Link from "next/link";
import { ArrowLongRightIcon } from "@heroicons/react/20/solid";
import { Dataset } from "@/schemas/dataset.interface";

function TopicCard({ group }: { group: Group & { package_count?: number } }) {
  return (
    <Link
      href={`/groups/${group.name}`}
      className="flex flex-col items-center gap-2 px-5 py-4 bg-white rounded-lg border border-gray-100 hover:border-accent hover:shadow-md transition-all group min-w-[120px] flex-shrink-0"
    >
      {group.image_display_url ? (
        <img
          src={group.image_display_url}
          alt={group.display_name}
          className="w-10 h-10 object-contain"
        />
      ) : (
        <span className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent text-lg font-bold">
          {group.display_name?.[0]?.toUpperCase()}
        </span>
      )}
      <span className="text-sm font-semibold text-gray-800 group-hover:text-accent text-center leading-tight">
        {group.display_name}
      </span>
      {group.package_count != null && (
        <span className="text-xs text-gray-400">{group.package_count} datasets</span>
      )}
    </Link>
  );
}

export default function MainSection({
  groups,
  datasets,
}: {
  groups: Array<Group & { package_count?: number }>;
  datasets: Array<Dataset>;
}) {
  return (
    <section className="bg-white">

      {/* Browse by Topic */}
      {groups.length > 0 && (
        <div className="custom-container py-10 border-b border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-xl text-gray-900">Browse by Topic</h2>
            <Link
              href="/groups"
              className="text-sm font-semibold text-accent hover:text-darkaccent flex items-center gap-1"
            >
              All topics ({groups.length})
              <ArrowLongRightIcon className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {groups.map((group) => (
              <TopicCard key={group.id} group={group} />
            ))}
          </div>
        </div>
      )}

      {/* Datasets + Groups grid */}
      <div className="custom-container py-10 homepage-padding">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-y-10">
          {datasets.length > 0 && (
            <section className="col-span-1 md:pr-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-xl text-gray-900">Recent Datasets</h2>
                <Link
                  href="/search"
                  className="text-sm font-semibold text-accent hover:text-darkaccent flex items-center gap-1"
                >
                  See all
                  <ArrowLongRightIcon className="w-4 h-4" />
                </Link>
              </div>
              <PopularDatasets datasets={datasets} />
            </section>
          )}

          {groups.length > 0 && (
            <section className="relative md:pl-6 md:border-l border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-xl text-gray-900">Categories</h2>
                {groups.length > 4 && (
                  <Link
                    href="/groups"
                    className="text-sm font-semibold text-accent hover:text-darkaccent flex items-center gap-1"
                  >
                    View all
                    <ArrowLongRightIcon className="w-4 h-4" />
                  </Link>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {groups.slice(0, 4).map((group) => (
                  <article key={group.id} className="col-span-1 h-fit">
                    <GroupCard
                      description={group.description}
                      display_name={group.display_name}
                      image_display_url={group.image_display_url}
                      name={group.name}
                    />
                  </article>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </section>
  );
}
