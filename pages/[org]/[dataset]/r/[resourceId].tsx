import { GetServerSideProps } from "next";
import Layout from "@/components/_shared/Layout";
import { Resource } from "@portaljs/ckan";
import { CKAN } from "@portaljs/ckan";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { RiArrowLeftLine } from "react-icons/ri";
import ResourcesBadges from "@/components/dataset/_shared/ResourcesBadges";
import { PrimeReactProvider } from "primereact/api";
import { getTimeAgo } from "@/lib/utils";
import { ResourcePageStructuredData } from "@/components/schema/ResourcePageStructuredData";
import CsvPreview from "@/components/dataset/CsvPreview";
import DataDictionary, { DictionaryField } from "@/components/dataset/DataDictionary";
import ApiPanel from "@/components/dataset/ApiPanel";
import { Tab } from "@headlessui/react";

const PdfViewer = dynamic(
  () => import("@portaljs/components").then((mod) => mod.PdfViewer),
  { ssr: false }
);

const ExcelViewer = dynamic(
  () => import("@portaljs/components").then((mod) => mod.Excel),
  { ssr: false }
);

const MapViewer = dynamic(
  () => import("@portaljs/components").then((mod) => mod.Map),
  { ssr: false }
);

export const getServerSideProps: GetServerSideProps = async (context) => {
  let orgName = context.params?.org as string;
  if (!orgName.startsWith("@")) {
    return { notFound: true };
  }
  orgName = orgName.split("@")[1];

  const DMS = process.env.NEXT_PUBLIC_DMS;
  const ckan = new CKAN(DMS);

  try {
    const resourceId = context.params?.resourceId;
    if (!resourceId) {
      return { notFound: true };
    }

    const resource = await ckan.getResourceMetadata(resourceId as string);
    if (!resource) {
      return { notFound: true };
    }

    let dataDictionary: DictionaryField[] = [];
    try {
      const info = await ckan.getResourceInfo(resourceId as string);
      dataDictionary = (info?.fields ?? []).filter((f) => f.id !== "_id");
    } catch {
      // DataStore not enabled or resource not in DataStore
    }

    return { props: { resource, orgName, dataDictionary } };
  } catch (e) {
    console.log(e);
    return { notFound: true };
  }
};

const TAB_CLS = ({ selected }: { selected: boolean }) =>
  `px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#006b65] ${
    selected
      ? "border-accent text-[#006b65]"
      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
  }`;

export default function ResourcePage({
  resource,
  orgName,
  dataDictionary,
}: {
  resource: Resource;
  orgName: string;
  dataDictionary: DictionaryField[];
}): JSX.Element {
  const resourceFormat = resource.format.toLowerCase();
  const router = useRouter();
  const { dataset } = router.query;
  const ckanUrl = process.env.NEXT_PUBLIC_DMS ?? "";
  const hasDataStore = dataDictionary.length > 0;

  const hasPreview =
    resourceFormat === "csv" ||
    resourceFormat === "pdf" ||
    ["xlsx", "xls"].includes(resourceFormat) ||
    resourceFormat === "geojson" ||
    !!resource?.iframe;

  return (
    <PrimeReactProvider>
      <ResourcePageStructuredData resource={resource} orgName={orgName} dataset={dataset} />
      <Layout>
        {/* Header */}
        <div className="custom-container pt-[30px] pb-4">
          <Link
            href={`/@${orgName}/${dataset}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <RiArrowLeftLine className="text-xl mr-1" aria-hidden="true" />
            Back to dataset
          </Link>

          <h1 className="text-2xl md:text-4xl font-black text-gray-900 lg:max-w-[80%]">
            {resource.name}
          </h1>

          <div className="mt-3">
            <ResourcesBadges resources={[resource]} />
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
            {resource.created && (
              <span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 inline mr-1 text-accent" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                Created: {getTimeAgo(resource.created)}
              </span>
            )}
            {resource.metadata_modified && (
              <span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 inline mr-1 text-accent" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Updated: {getTimeAgo(resource.metadata_modified)}
              </span>
            )}
            <span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 inline mr-1 text-accent" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
              Size: {resource.size || "N/A"}
            </span>
          </div>

          {/* Download button */}
          <div className="mt-4">
            <Link
              href={resource.url}
              className="bg-accent py-2 px-4 text-sm text-white rounded-xl font-roboto font-bold hover:bg-darkaccent duration-150 inline-flex items-center gap-1.5"
            >
              Download
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </Link>
          </div>

          {resource.description && (
            <p className="text-stone-500 mt-4 text-sm leading-relaxed">{resource.description}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="custom-container pb-16">
          <Tab.Group>
            <div className="border-b border-gray-200">
              <Tab.List className="-mb-px flex gap-1 overflow-x-auto" aria-label="Resource sections">
                {hasPreview && (
                  <Tab className={TAB_CLS}>Preview</Tab>
                )}
                {hasDataStore && (
                  <Tab className={TAB_CLS}>Data Dictionary</Tab>
                )}
                <Tab className={TAB_CLS}>API</Tab>
              </Tab.List>
            </div>

            <Tab.Panels className="mt-6">
              {/* Preview panel */}
              {hasPreview && (
                <Tab.Panel>
                  {resourceFormat === "csv" && (
                    <CsvPreview resourceUrl={resource.url} dictionary={dataDictionary} />
                  )}
                  {resourceFormat === "pdf" && (
                    <PdfViewer layout={true} url={resource.url} parentClassName="h-[900px]" />
                  )}
                  {["xlsx", "xls"].includes(resourceFormat) && (
                    <ExcelViewer url={resource.url} />
                  )}
                  {resourceFormat === "geojson" && (
                    <MapViewer layers={[{ data: resource.url, name: "Geojson" }]} title={resource.name} />
                  )}
                  {resource?.iframe && (
                    <iframe src={resource.url} style={{ width: "100%", height: "600px" }} title={resource.name} />
                  )}
                </Tab.Panel>
              )}

              {/* Data Dictionary panel */}
              {hasDataStore && (
                <Tab.Panel>
                  <DataDictionary fields={dataDictionary} />
                </Tab.Panel>
              )}

              {/* API panel */}
              <Tab.Panel>
                <ApiPanel
                  ckanUrl={ckanUrl}
                  resourceId={resource.id}
                  datasetName={typeof dataset === "string" ? dataset : ""}
                  resourceUrl={resource.url}
                  hasDataStore={hasDataStore}
                />
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      </Layout>
    </PrimeReactProvider>
  );
}
