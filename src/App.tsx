import { useQuery } from "@tanstack/react-query";
import * as R from "ramda";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./App.css";
import hardCodedRegionalTotalsData from "./data/NWSSRegionalLevel.json";
import hardCodedVariantProportionsData from "./data/NWSSVariantBarChart.json";
import { useColorMap } from "./colorList";
type VariantName = Exclude<
  keyof (typeof hardCodedVariantProportionsData)[0],
  "week_end"
>; // includes week_end because lazy
type TotalWithDate = {
  date: Date;
  total: number;
};
type TotalByVariantWithDate = { [key: string]: number | Date };

export default function App() {
  const [showSplit, setShowSplit] = useState(false);

  const {
    data: variantProportionsData = [], // hardCodedVariantProportionsData,
    isSuccess: variantProportionsLoaded,
  } = useQuery<typeof hardCodedVariantProportionsData>({
    queryKey: ["variant-proportions"],
    queryFn: () =>
      fetch(
        "https://www.cdc.gov/wcms/vizdata/NCEZID_DIDRI/NWSSVariantBarChart.json"
      ).then((res) => res.json()),
  });
  const {
    data: regionalTotalsData = [], //hardCodedRegionalTotalsData,
    isSuccess: regionalTotalsLoaded,
  } = useQuery<typeof hardCodedRegionalTotalsData>({
    queryKey: ["regional-totals"],
    queryFn: () =>
      fetch(
        "https://www.cdc.gov/wcms/vizdata/NCEZID_DIDRI/NWSSRegionalLevel.json"
      ).then((res) => res.json()),
  });

  const variantNames = useMemo(
    () =>
      Object.keys(
        variantProportionsData?.[0] || hardCodedVariantProportionsData[0]
      ).filter((key) => key != "week_end") as VariantName[],
    [variantProportionsData]
  );

  console.log({ variantProportionsData, regionalTotalsData });

  const proportionsData = variantProportionsData.map((row) => ({
    ...R.mapObjIndexed((v) => (v === null ? 0 : Number(v)), row),
    date: new Date(row.week_end),
  }));

  const totalsData: TotalWithDate[] = regionalTotalsData.map((row) => {
    return {
      date: new Date(row.Week_Ending_Date),
      total: Number(row.National_WVAL),
    };
  });

  const totalsByVariantData: TotalByVariantWithDate[] = useMemo(
    () =>
      proportionsData.map((row) => {
        const scaledValuesByVariant = {} as Record<VariantName, number>;

        const totalForDate = totalsData.find(
          ({ date }) => date.getTime() == row.date.getTime()
        )?.total;
        // console.log(totalsData, row.date);

        for (const variantName of variantNames) {
          // console.log({ thing: row[variantName], totalForDate });
          scaledValuesByVariant[variantName] =
            (row[variantName] * totalForDate!) / 100;
        }
        return {
          date: row.date,
          ...scaledValuesByVariant,
        };
      }),
    [proportionsData, totalsData, variantNames]
  );

  // TODO: Refactor to make this just be a map by variant name instead
  const { colorMap: colors, randomizeColors } = useColorMap(variantNames);

  const [orderedVariantNames, setOrderedVariantNames] = useState([]);

  function shuffleVariantOrder() {
    setIsAnimationActive(false);
    const newVariants = [
      ...shuffle(R.without(["Other"], orderedVariantNames)),
      "Other", // Always put "Other" at the top
    ];
    setOrderedVariantNames(newVariants);
    setTimeout(() => setIsAnimationActive(true), 0);
  }

  const setSortByAllTimeMax = useCallback(() => {
    setIsAnimationActive(false);
    setOrderedVariantNames(sortByAllTimeMax(totalsByVariantData, variantNames));
  }, [totalsByVariantData, variantNames]);

  const setSortByCurrentHighest = useCallback(() => {
    setIsAnimationActive(false);
    const newVariants = sortByCurrentHighest(totalsByVariantData, variantNames);
    setOrderedVariantNames(newVariants);
    setTimeout(() => setIsAnimationActive(true), 0);
  }, [totalsByVariantData, variantNames]);

  useEffect(() => {
    if (
      !orderedVariantNames.length &&
      variantNames.length &&
      totalsByVariantData.length
    ) {
      setSortByCurrentHighest();
    }
  }, [
    orderedVariantNames.length,
    setSortByCurrentHighest,
    totalsByVariantData.length,
    variantNames.length,
  ]);

  const moveVariantToBottom = (variantName) => {
    setOrderedVariantNames([
      variantName,
      ...orderedVariantNames.filter((name) => name !== variantName),
    ]);
  };

  const [isAnimationActive, setIsAnimationActive] = useState(true);

  const handleVariantClick: any = (datum, event) => {
    setIsAnimationActive(false);
    moveVariantToBottom(datum.name);
    setTimeout(() => setIsAnimationActive(true), 10);
  };

  function formatVariantName(name) {
    return name.replace(/_/g, ".");
  }

  const CustomTooltip = ({
    active,
    payload,
    label,
    unit,
  }: {
    active?: any;
    payload?: any;
    label?: any;
    unit?: any;
  }) => {
    if (active && payload && payload.length) {
      const date = payload[0].payload.date;
      return (
        <div
          style={{
            backgroundColor: "var(--bg-color)",
            border: "thin solid var(--border-color)",
          }}
        >
          <div>{date.toISOString().replace(/T.*/, "")}</div>
          {[...payload]
            .reverse()
            .filter(({ value }) => value > 0)
            .map(({ name, stroke, dataKey, value }) => {
              return (
                <div key={name}>
                  <span style={{ color: stroke }}>
                    {formatVariantName(dataKey)}: {value.toFixed(0)}
                    {unit}
                  </span>
                </div>
              );
            })}
        </div>
      );
    }

    return null;
  };

  const maxByVariant = useMemo(() => {
    const maxByVariant: Record<string, number> = {};
    variantNames.forEach((variantName) => {
      const values = totalsByVariantData.map(
        (row) => row[variantName]
      ) as number[];
      maxByVariant[variantName] = Math.max(...values);
    });
    return maxByVariant;
  }, [totalsByVariantData, variantNames]);

  const earliestDateInBothDatasets = useMemo(
    () =>
      new Date(
        Math.max(
          Math.min(...proportionsData.map(({ date }) => date.getTime())),
          Math.min(...totalsData.map(({ date }) => date.getTime()))
        )
      ),
    [proportionsData, totalsData]
  );

  const totalMax = useMemo(
    () => Object.values(maxByVariant).reduce(R.add),
    [maxByVariant]
  );
  const highestMax = useMemo(
    () =>
      Math.max(
        ...totalsData
          .filter((row) => row.date > earliestDateInBothDatasets) // Filter for dates that will be shown in the final graph
          .map(({ total }) => total)
      ),
    [earliestDateInBothDatasets, totalsData]
  );
  console.log({
    maxByVariant,
    totalMax,
    highestMax,
    totalsByDay: totalsData.map(({ total }) => total),
  });

  return (
    <div
      style={{
        height: "95vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div>
        Original data:{" "}
        <a href="https://www.cdc.gov/nwss/rv/COVID19-variants.html">
          Variants in Wastewater (percents)
        </a>
        ,{" "}
        <a href="https://www.cdc.gov/nwss/rv/COVID19-nationaltrend.html">
          National and Regional Trends (totals)
        </a>
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          onClick={() => {
            setIsAnimationActive(false);
            setShowSplit(!showSplit);
            setTimeout(() => {
              setIsAnimationActive(true);
            }, 10);
          }}
        >
          Toggle split (experimental)
        </button>
        <button onClick={shuffleVariantOrder}>Shuffle variant order</button>
        <button onClick={setSortByAllTimeMax}>Sort by all time highest</button>
        <button onClick={setSortByCurrentHighest}>
          Sort by current highest
        </button>
        <button onClick={randomizeColors}>Randomize colors</button>
      </div>
      {/* <label>
        <input
          type="checkbox"
          checked={showAbsolute}
          onChange={(e) => setShowAbsolute(e.target.checked)}
        />{" "}
        Show absolute numbers
      </label> */}
      <div
        style={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "hidden",
        }}
      >
        {showSplit ? (
          <div
            style={{
              overflow: "hidden",
              flexBasis: "70%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {[...orderedVariantNames].reverse().map((variantName) => (
              <ResponsiveContainer
                width="100%"
                height={`${(maxByVariant[variantName] / totalMax) * 100}%`}
                style={{ flexShrink: 0, flexGrow: 0 }}
              >
                <AreaChart
                  syncId={1}
                  width={500}
                  height={300}
                  data={totalsByVariantData}
                  margin={{
                    top: 0,
                    right: 30,
                    left: 20,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <YAxis ticks={[]} tickFormatter={() => ""} />
                  <Tooltip content={() => null} position={{ x: 0, y: 0 }} />
                  <Area
                    key={variantName}
                    type="step"
                    dataKey={variantName}
                    name={variantName}
                    // stroke={"transparent"}
                    stroke={colors[variantName]}
                    fill={colors[variantName]}
                    // fill={"transparent"}
                    activeDot={{ r: 8 }}
                    stackId={1}
                    onClick={handleVariantClick}
                    isAnimationActive={isAnimationActive}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ))}
          </div>
        ) : (
          <div
            style={{ overflow: "hidden", flexBasis: showSplit ? "70%" : "50%" }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                syncId={1}
                width={500}
                height={300}
                data={totalsByVariantData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date: Date) =>
                    date.toISOString().replace(/T.*/, "")
                  }
                />
                <YAxis domain={[0, Math.ceil(highestMax)]} />
                <Tooltip
                  content={(args) => <CustomTooltip {...args} />}
                  position={{ x: 0, y: 0 }}
                />
                {orderedVariantNames.map((variantName, i) => (
                  <Area
                    key={variantName}
                    type="step"
                    dataKey={variantName}
                    name={variantName}
                    // stroke={"transparent"}
                    stroke={colors[variantName]}
                    fill={colors[variantName]}
                    // fill={"transparent"}
                    activeDot={{ r: 8 }}
                    stackId={1}
                    onClick={handleVariantClick}
                    isAnimationActive={isAnimationActive}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        <div
          style={{ overflow: "hidden", flexBasis: showSplit ? "30%" : "50%" }}
        >
          <ResponsiveContainer>
            <AreaChart
              syncId={1}
              width={500}
              height={300}
              data={proportionsData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date: Date) =>
                  date.toISOString().replace(/T.*/, "")
                }
              />
              <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} />
              <Tooltip
                content={(args) => <CustomTooltip {...args} unit={"%"} />}
                position={{ x: 0, y: 0 }}
              />
              <Legend
                formatter={(value, entry, index) => value.replace(/_/g, ".")}
              />
              {orderedVariantNames.map((variantName, i) => (
                <Area
                  key={variantName}
                  type="step"
                  dataKey={variantName}
                  name={variantName}
                  // stroke={"transparent"}
                  stroke={colors[variantName]}
                  fill={colors[variantName]}
                  activeDot={{ r: 8 }}
                  stackId={1}
                  onClick={handleVariantClick}
                  isAnimationActive={isAnimationActive}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      {(!regionalTotalsLoaded || !variantProportionsLoaded) && (
        <div>Some live data could not be loaded, using fallback data files</div>
      )}
    </div>
  );
}

function shuffle<T>(array: T[]) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function sortByAllTimeMax(
  values: TotalByVariantWithDate[],
  variantNames: string[]
) {
  const maxByVariant = {} as Record<VariantName, number>;
  for (const variantName of variantNames) {
    if (variantName === "Other") continue;
    let max = 0;
    for (const row of values) {
      max = Math.max(max, row[variantName] as number);
    }
    maxByVariant[variantName] = max;
  }
  return R.tap(console.log, [
    ...R.sortBy(
      (variantName: VariantName) => -maxByVariant[variantName],
      Object.keys(R.omit(["date", "Other"], values[0])) as VariantName[]
    ),
    // Always put "Other" at the top of the graph
    "Other",
  ]);
}

function sortByCurrentHighest(
  proportionsData: TotalByVariantWithDate[],
  variantNames: string[]
) {
  const maxRow = R.reduce(
    R.maxBy((row: (typeof proportionsData)[0]) => (row.date as Date).getTime()),
    proportionsData[0],
    proportionsData
  );
  const newVariants = [
    ...R.sortBy(
      (variantName: keyof typeof maxRow) => -maxRow[variantName] || 0,
      R.without(["Other"], variantNames)
    ),
    "Other", // Always put "Other" at the top
  ];
  return newVariants;
}
