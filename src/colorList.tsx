import * as R from "ramda";
import { useState, useCallback, useMemo } from "react";

const generateColorList = () => {
  return R.range(0, 500).map(() => {
    const hexString = Math.floor(Math.random() * (0xffffff + 1)).toString(16);
    const padded =
      "#" + R.repeat("0", 6 - hexString.length).join("") + hexString;
    return padded;
  });
};

export function useColorMap(names) {
  const [colorList, setColorList] = useState<string[]>(generateColorList());

  const colorMap = useMemo(() => {
    const sortedNames = [...names].sort();
    const mapping: Record<string, string> = {};
    for (let i = 0; i < sortedNames.length; i++) {
      mapping[sortedNames[i]] = colorList[i];
    }
    return mapping;
  }, [colorList, names]);

  console.log({ colorList, colorMap });

  const randomizeColors = useCallback(() => {
    setColorList(generateColorList());
  }, [setColorList]);

  return { colorList, colorMap, randomizeColors };
}
