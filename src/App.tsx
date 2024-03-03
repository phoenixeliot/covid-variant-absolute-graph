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
import variantProportionsData from "./data/NWSSVariantBarChart.json";
import regionalTotalsData from "./data/NWSSRegionalLevel.json";
import * as R from "ramda";
import { useState } from "react";
type VariantName = Exclude<
  keyof (typeof variantProportionsData)[0],
  "week_end"
>; // includes week_end because lazy
type TotalWithDate = {
  date: Date;
  total: number;
};
type TotalByVariantWithDate = { date: Date } & Record<VariantName, number>;
const variantNames = Object.keys(variantProportionsData[0]).filter(
  (key) => key != "week_end"
) as VariantName[];

export default function App() {
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

  const totalsByVariantData: TotalByVariantWithDate[] = proportionsData.map(
    (row) => {
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
    }
  );

  const [orderedVariantNames, setOrderedVariantNames] = useState(
    // variantNames
    findSortOrder(totalsByVariantData)
  );

  // TODO: Refactor to make this just be a map by variant name instead
  const [colors, setColors] = useState(
    Object.fromEntries(
      R.zip(
        variantNames,
        orderedVariantNames.map(() => {
          const hexString = Math.floor(Math.random() * (0xffffff + 1)).toString(
            16
          );
          return "#" + R.repeat("0", 6 - hexString.length) + hexString;
        })
      )
    )
  );

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

  const CustomTooltip = ({ active, payload, label }) => {
    console.log({ active, payload, label });
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: "black" }}>
          {payload
            .filter(({ value }) => value > 0)
            .map(({ name, stroke, dataKey, value }) => (
              <div>
                <span style={{ color: stroke }}>
                  {formatVariantName(dataKey)}: {value.toFixed(0)}
                </span>
              </div>
            ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ width: "90vw", height: "90vh" }}>
      <button onClick={shuffleVariantOrder}>Shuffle variant order</button>
      {/* <label>
        <input
          type="checkbox"
          checked={showAbsolute}
          onChange={(e) => setShowAbsolute(e.target.checked)}
        />{" "}
        Show absolute numbers
      </label> */}
      <ResponsiveContainer width="100%" height="50%">
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
          <Tooltip content={CustomTooltip} position={{ x: 0, y: 0 }} />
          <Legend />
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
      <ResponsiveContainer width="100%" height="50%">
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
          <YAxis />
          <Tooltip content={CustomTooltip} position={{ x: 0, y: 0 }} />
          <Legend />
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
