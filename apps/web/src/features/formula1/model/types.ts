export type Formula1Driver = {
  id: string;
  code: string;
  givenName: string;
  familyName: string;
  nationality: string;
  number: string | null;
};

export type Formula1Constructor = {
  id: string;
  name: string;
  nationality: string;
};

export type Formula1Circuit = {
  id: string;
  name: string;
  locality: string;
  country: string;
};

export type Formula1SessionKind =
  | "practice"
  | "sprint-qualifying"
  | "sprint"
  | "qualifying"
  | "race";

export type Formula1Session = {
  id: string;
  label: string;
  kind: Formula1SessionKind;
  startsAt: string | null;
};

export type Formula1Race = {
  season: number;
  round: number;
  name: string;
  circuit: Formula1Circuit;
  startsAt: string | null;
  date: string;
  sessions: Formula1Session[];
};

export type Formula1DriverStanding = {
  position: number;
  points: number;
  wins: number;
  driver: Formula1Driver;
  constructors: Formula1Constructor[];
};

export type Formula1ConstructorStanding = {
  position: number;
  points: number;
  wins: number;
  constructor: Formula1Constructor;
};

export type Formula1RaceResult = {
  position: number;
  points: number;
  grid: number;
  laps: number;
  status: string;
  time: string | null;
  driver: Formula1Driver;
  constructor: Formula1Constructor;
};

export type Formula1Winner = Formula1RaceResult;

export type Formula1Snapshot = {
  season: number;
  races: Formula1Race[];
  driverStandings: Formula1DriverStanding[];
  constructorStandings: Formula1ConstructorStanding[];
  winnersByRound: Record<number, Formula1Winner>;
  resultsByRound: Record<number, Formula1RaceResult[]>;
  updatedAt: string;
};
