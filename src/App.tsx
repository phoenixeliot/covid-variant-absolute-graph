import { useQuery } from "@tanstack/react-query";
import * as R from "ramda";
import { useEffect, useMemo, useState } from "react";
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
type TotalByVariantWithDate = { date: Date } & Record<VariantName, number>;
const variantNames = Object.keys(hardCodedVariantProportionsData[0]).filter(
  (key) => key != "week_end"
) as VariantName[];

export default function App() {
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

  console.log({ variantProportionsData, regionalTotalsData });

  const proportionsData = variantProportionsData.map((row) => ({
    ...R.mapObjIndexed((v) => (v === null ? 0 : Number(v)), row),
    date: new Date(row.week_end),
  }));

  const totalsData: TotalWithDate[] = regionalTotalsData.map((row) => ({
    date: new Date(row.date),
    total:
      Number(row.Midwest) +
      Number(row.National) +
      Number(row.Northeast) +
      Number(row.South) +
      Number(row.West),
  }));

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
          scaledValuesByVariant[variantName] = row[variantName] * totalForDate!;
        }
        return {
          date: row.date,
          ...scaledValuesByVariant,
        };
      }),
    [proportionsData, totalsData]
  );

  const [orderedVariantNames, setOrderedVariantNames] = useState([]);
  useEffect(() => {
    if (!orderedVariantNames.length) {
      setOrderedVariantNames(findSortOrder(totalsByVariantData));
    }
  }, [orderedVariantNames, totalsByVariantData]);

  // TODO: Refactor to make this just be a map by variant name instead
  const { colorMap: colors, randomizeColors } = useColorMap(variantNames);

  function shuffleVariantOrder() {
    // const colorVariantPairs = shuffle(R.zip(colors, orderedVariantNames));
    // const newColors = colorVariantPairs.map(([color, variant]) => color);
    // const newVariants = colorVariantPairs.map(([color, variant]) => variant);
    // setColors(newColors);
    // setOrderedVariantNames(newVariants);
    setIsAnimationActive(false);
    const newVariants = shuffle(orderedVariantNames);
    setOrderedVariantNames(newVariants);
    setTimeout(() => setIsAnimationActive(true), 0);
  }

  const [showAbsolute, setShowAbsolute] = useState(true);

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
    setTimeout(() => setIsAnimationActive(true), 0);
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
        <div style={{ backgroundColor: "black" }}>
          <span>{date.toISOString().replace(/T.*/, "")}</span>
          {payload
            .filter(({ value }) => value > 0)
            .map(({ name, stroke, dataKey, value }) => {
              return (
                <div>
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
        <a href="https://www.cdc.gov/nwss/rv/COVID19-variants.html">
          National and Regional Trends (totals)
        </a>
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button onClick={shuffleVariantOrder}>Shuffle variant order</button>
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
        <div style={{ overflow: "hidden", flexBasis: "50%" }}>
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
              <YAxis />
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
        <div style={{ overflow: "hidden", flexBasis: "50%" }}>
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

function findSortOrder(values: TotalByVariantWithDate[]) {
  const rangeByVariant = {} as Record<VariantName, number>;
  for (const variantName of variantNames) {
    let min = Infinity;
    let max = 0;
    for (const row of values) {
      min = Math.min(min, row[variantName]);
      max = Math.max(max, row[variantName]);
    }
    rangeByVariant[variantName] = max - min;
  }
  return R.sortBy(
    (variantName: VariantName) => -rangeByVariant[variantName],
    Object.keys(R.omit(["date"], values[0])) as VariantName[]
  );
}
