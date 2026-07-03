type PathToken =
  | {
      type: "command";
      value: string;
    }
  | {
      type: "number";
      value: number;
    };

type Point = {
  x: number;
  y: number;
};

type PathCommand =
  | {
      type: "M" | "L";
      points: [Point];
    }
  | {
      type: "C";
      points: [Point, Point, Point];
    }
  | {
      type: "Z";
      points: [];
    };

export type NormalizedSvgPath = {
  data?: string;
  changes: string[];
  warnings: string[];
};

const commandParameterCount: Record<string, number> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
};

function isCommandToken(token: PathToken | undefined): token is Extract<PathToken, { type: "command" }> {
  return token?.type === "command";
}

function isNumberToken(token: PathToken | undefined): token is Extract<PathToken, { type: "number" }> {
  return token?.type === "number";
}

function tokenizeSvgPath(data: string): PathToken[] | undefined {
  const tokens: PathToken[] = [];
  const tokenPattern = /[AaCcHhLlMmQqSsTtVvZz]|[-+]?(?:(?:\d*\.\d+)|(?:\d+\.?))(?:[eE][-+]?\d+)?/g;
  let match: RegExpExecArray | null;
  let cursor = 0;

  while ((match = tokenPattern.exec(data)) !== null) {
    const skipped = data.slice(cursor, match.index).replace(/[\s,]+/g, "");
    if (skipped) return undefined;

    const value = match[0];
    if (/^[AaCcHhLlMmQqSsTtVvZz]$/.test(value)) {
      tokens.push({ type: "command", value });
    } else {
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) return undefined;
      tokens.push({ type: "number", value: numberValue });
    }

    cursor = match.index + value.length;
  }

  const tail = data.slice(cursor).replace(/[\s,]+/g, "");
  return tail ? undefined : tokens;
}

function readNumbers(tokens: PathToken[], startIndex: number, count: number) {
  const values: number[] = [];

  for (let offset = 0; offset < count; offset += 1) {
    const token = tokens[startIndex + offset];
    if (!isNumberToken(token)) return undefined;
    values.push(token.value);
  }

  return values;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 1000) / 1000;
  if (Object.is(rounded, -0)) return "0";
  return String(rounded).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function formatPoint(point: Point) {
  return `${formatNumber(point.x)} ${formatNumber(point.y)}`;
}

function reflectPoint(point: Point | undefined, current: Point): Point {
  if (!point) return { ...current };
  return {
    x: current.x * 2 - point.x,
    y: current.y * 2 - point.y,
  };
}

function vectorAngle(origin: Point, target: Point) {
  const dot = origin.x * target.x + origin.y * target.y;
  const length = Math.hypot(origin.x, origin.y) * Math.hypot(target.x, target.y);
  if (!length) return 0;

  const ratio = Math.min(1, Math.max(-1, dot / length));
  const sign = origin.x * target.y - origin.y * target.x < 0 ? -1 : 1;
  return sign * Math.acos(ratio);
}

function transformArcPoint(point: Point, center: Point, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: center.x + cos * point.x - sin * point.y,
    y: center.y + sin * point.x + cos * point.y,
  };
}

function arcToCubicCommands(
  start: Point,
  radiusX: number,
  radiusY: number,
  rotationDegrees: number,
  largeArcFlag: number,
  sweepFlag: number,
  end: Point,
): PathCommand[] {
  let rx = Math.abs(radiusX);
  let ry = Math.abs(radiusY);

  if (rx === 0 || ry === 0 || (start.x === end.x && start.y === end.y)) {
    return [{ type: "L", points: [end] }];
  }

  const rotation = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const dx = (start.x - end.x) / 2;
  const dy = (start.y - end.y) / 2;
  const x1Prime = cos * dx + sin * dy;
  const y1Prime = -sin * dx + cos * dy;
  const radiusScale = x1Prime ** 2 / rx ** 2 + y1Prime ** 2 / ry ** 2;

  if (radiusScale > 1) {
    const scale = Math.sqrt(radiusScale);
    rx *= scale;
    ry *= scale;
  }

  const numerator = rx ** 2 * ry ** 2 - rx ** 2 * y1Prime ** 2 - ry ** 2 * x1Prime ** 2;
  const denominator = rx ** 2 * y1Prime ** 2 + ry ** 2 * x1Prime ** 2;
  const coefficient =
    (largeArcFlag === sweepFlag ? -1 : 1) * Math.sqrt(Math.max(0, denominator ? numerator / denominator : 0));
  const cxPrime = coefficient * ((rx * y1Prime) / ry);
  const cyPrime = coefficient * (-(ry * x1Prime) / rx);
  const center = {
    x: cos * cxPrime - sin * cyPrime + (start.x + end.x) / 2,
    y: sin * cxPrime + cos * cyPrime + (start.y + end.y) / 2,
  };
  const startVector = {
    x: (x1Prime - cxPrime) / rx,
    y: (y1Prime - cyPrime) / ry,
  };
  const endVector = {
    x: (-x1Prime - cxPrime) / rx,
    y: (-y1Prime - cyPrime) / ry,
  };
  let startAngle = vectorAngle({ x: 1, y: 0 }, startVector);
  let deltaAngle = vectorAngle(startVector, endVector);

  if (!sweepFlag && deltaAngle > 0) deltaAngle -= Math.PI * 2;
  if (sweepFlag && deltaAngle < 0) deltaAngle += Math.PI * 2;

  const segmentCount = Math.max(1, Math.ceil(Math.abs(deltaAngle) / (Math.PI / 2)));
  const segmentAngle = deltaAngle / segmentCount;
  const commands: PathCommand[] = [];

  for (let index = 0; index < segmentCount; index += 1) {
    const nextAngle = startAngle + segmentAngle;
    const alpha = (4 / 3) * Math.tan(segmentAngle / 4);
    const startEllipsePoint = {
      x: rx * Math.cos(startAngle),
      y: ry * Math.sin(startAngle),
    };
    const endEllipsePoint = {
      x: rx * Math.cos(nextAngle),
      y: ry * Math.sin(nextAngle),
    };
    const control1 = {
      x: startEllipsePoint.x - alpha * rx * Math.sin(startAngle),
      y: startEllipsePoint.y + alpha * ry * Math.cos(startAngle),
    };
    const control2 = {
      x: endEllipsePoint.x + alpha * rx * Math.sin(nextAngle),
      y: endEllipsePoint.y - alpha * ry * Math.cos(nextAngle),
    };

    commands.push({
      type: "C",
      points: [
        transformArcPoint(control1, center, rotation),
        transformArcPoint(control2, center, rotation),
        transformArcPoint(endEllipsePoint, center, rotation),
      ],
    });

    startAngle = nextAngle;
  }

  return commands;
}

function pathCommandToData(command: PathCommand) {
  if (command.type === "Z") return "Z";
  return `${command.type}${command.points.map(formatPoint).join(" ")}`;
}

export function isFigmaSafePathData(data: string) {
  return !/[AaHhQqSsTtVvRrOoUuNnPpEeFfGgIiJjKkWwXxYyBbDd]/.test(data) && !/[clmz]/.test(data);
}

export function normalizeSvgPathForFigma(data: string): NormalizedSvgPath {
  const tokens = tokenizeSvgPath(data.trim());
  const warnings: string[] = [];
  const changes = new Set<string>();

  if (!tokens?.length) {
    return {
      warnings: ["路径数据无法解析。"],
      changes: [],
    };
  }

  const commands: PathCommand[] = [];
  let index = 0;
  let activeCommand = "";
  let current: Point = { x: 0, y: 0 };
  let subpathStart: Point = { x: 0, y: 0 };
  let lastCubicControl: Point | undefined;
  let lastQuadraticControl: Point | undefined;
  let lastCommandType = "";

  while (index < tokens.length) {
    const token = tokens[index];
    if (isCommandToken(token)) {
      activeCommand = token.value;
      index += 1;
    }

    if (!activeCommand) {
      return {
        warnings: ["路径缺少起始命令。"],
        changes: Array.from(changes),
      };
    }

    const commandUpper = activeCommand.toUpperCase();
    const isRelative = activeCommand !== commandUpper;

    if (commandUpper === "Z") {
      commands.push({ type: "Z", points: [] });
      current = { ...subpathStart };
      lastCubicControl = undefined;
      lastQuadraticControl = undefined;
      lastCommandType = "Z";
      activeCommand = "";
      continue;
    }

    const parameterCount = commandParameterCount[commandUpper];
    if (!parameterCount) {
      return {
        warnings: [`不支持的路径命令：${activeCommand}`],
        changes: Array.from(changes),
      };
    }

    let consumedSet = false;
    let firstMoveToPair = commandUpper === "M";

    while (index < tokens.length && !isCommandToken(tokens[index])) {
      const values = readNumbers(tokens, index, parameterCount);
      if (!values) {
        return {
          warnings: [`路径命令 ${activeCommand} 参数不足。`],
          changes: Array.from(changes),
        };
      }

      index += parameterCount;
      consumedSet = true;

      const absolutePoint = (x: number, y: number): Point => ({
        x: isRelative ? current.x + x : x,
        y: isRelative ? current.y + y : y,
      });

      if (commandUpper === "M") {
        const nextPoint = absolutePoint(values[0], values[1]);
        const type = firstMoveToPair ? "M" : "L";
        commands.push({ type, points: [nextPoint] });
        current = nextPoint;
        subpathStart = nextPoint;
        lastCubicControl = undefined;
        lastQuadraticControl = undefined;
        lastCommandType = type;
        firstMoveToPair = false;
        activeCommand = isRelative ? "l" : "L";
        if (isRelative) changes.add("相对路径命令已转为绝对坐标。");
        continue;
      }

      if (isRelative) changes.add("相对路径命令已转为绝对坐标。");

      if (commandUpper === "L") {
        const nextPoint = absolutePoint(values[0], values[1]);
        commands.push({ type: "L", points: [nextPoint] });
        current = nextPoint;
        lastCubicControl = undefined;
        lastQuadraticControl = undefined;
        lastCommandType = "L";
        continue;
      }

      if (commandUpper === "H") {
        const nextPoint = {
          x: isRelative ? current.x + values[0] : values[0],
          y: current.y,
        };
        commands.push({ type: "L", points: [nextPoint] });
        current = nextPoint;
        lastCubicControl = undefined;
        lastQuadraticControl = undefined;
        lastCommandType = "L";
        changes.add("H/V 直线命令已展开为 L。");
        continue;
      }

      if (commandUpper === "V") {
        const nextPoint = {
          x: current.x,
          y: isRelative ? current.y + values[0] : values[0],
        };
        commands.push({ type: "L", points: [nextPoint] });
        current = nextPoint;
        lastCubicControl = undefined;
        lastQuadraticControl = undefined;
        lastCommandType = "L";
        changes.add("H/V 直线命令已展开为 L。");
        continue;
      }

      if (commandUpper === "C") {
        const control1 = absolutePoint(values[0], values[1]);
        const control2 = absolutePoint(values[2], values[3]);
        const nextPoint = absolutePoint(values[4], values[5]);
        commands.push({ type: "C", points: [control1, control2, nextPoint] });
        current = nextPoint;
        lastCubicControl = control2;
        lastQuadraticControl = undefined;
        lastCommandType = "C";
        continue;
      }

      if (commandUpper === "S") {
        const control1 = lastCommandType === "C" || lastCommandType === "S" ? reflectPoint(lastCubicControl, current) : { ...current };
        const control2 = absolutePoint(values[0], values[1]);
        const nextPoint = absolutePoint(values[2], values[3]);
        commands.push({ type: "C", points: [control1, control2, nextPoint] });
        current = nextPoint;
        lastCubicControl = control2;
        lastQuadraticControl = undefined;
        lastCommandType = "S";
        changes.add("S 平滑曲线已展开为 C。");
        continue;
      }

      if (commandUpper === "Q") {
        const control = absolutePoint(values[0], values[1]);
        const nextPoint = absolutePoint(values[2], values[3]);
        const control1 = {
          x: current.x + (2 / 3) * (control.x - current.x),
          y: current.y + (2 / 3) * (control.y - current.y),
        };
        const control2 = {
          x: nextPoint.x + (2 / 3) * (control.x - nextPoint.x),
          y: nextPoint.y + (2 / 3) * (control.y - nextPoint.y),
        };
        commands.push({ type: "C", points: [control1, control2, nextPoint] });
        current = nextPoint;
        lastCubicControl = control2;
        lastQuadraticControl = control;
        lastCommandType = "Q";
        changes.add("Q 二次曲线已展开为 C。");
        continue;
      }

      if (commandUpper === "T") {
        const control = lastCommandType === "Q" || lastCommandType === "T" ? reflectPoint(lastQuadraticControl, current) : { ...current };
        const nextPoint = absolutePoint(values[0], values[1]);
        const control1 = {
          x: current.x + (2 / 3) * (control.x - current.x),
          y: current.y + (2 / 3) * (control.y - current.y),
        };
        const control2 = {
          x: nextPoint.x + (2 / 3) * (control.x - nextPoint.x),
          y: nextPoint.y + (2 / 3) * (control.y - nextPoint.y),
        };
        commands.push({ type: "C", points: [control1, control2, nextPoint] });
        current = nextPoint;
        lastCubicControl = control2;
        lastQuadraticControl = control;
        lastCommandType = "T";
        changes.add("T 平滑二次曲线已展开为 C。");
        continue;
      }

      if (commandUpper === "A") {
        const nextPoint = absolutePoint(values[5], values[6]);
        const arcCommands = arcToCubicCommands(
          current,
          values[0],
          values[1],
          values[2],
          values[3] ? 1 : 0,
          values[4] ? 1 : 0,
          nextPoint,
        );
        commands.push(...arcCommands);
        current = nextPoint;
        lastCubicControl = arcCommands.at(-1)?.type === "C" ? arcCommands.at(-1)?.points[1] : undefined;
        lastQuadraticControl = undefined;
        lastCommandType = "A";
        changes.add("A/a 圆弧命令已展开为 C 曲线。");
      }
    }

    if (!consumedSet && activeCommand) {
      return {
        warnings: [`路径命令 ${activeCommand} 没有参数。`],
        changes: Array.from(changes),
      };
    }
  }

  const normalized = commands.map(pathCommandToData).join(" ");

  return {
    data: normalized,
    changes: Array.from(changes),
    warnings,
  };
}
