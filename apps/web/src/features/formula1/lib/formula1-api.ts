import type {
  Formula1Constructor,
  Formula1ConstructorStanding,
  Formula1Driver,
  Formula1DriverStanding,
  Formula1Race,
  Formula1RaceResult,
  Formula1Session,
  Formula1SessionKind,
  Formula1Snapshot,
} from "@/features/formula1/model/types";

const API_BASE = "https://api.jolpi.ca/ergast/f1";

type ApiDriver = {
  driverId: string;
  code?: string;
  givenName: string;
  familyName: string;
  nationality: string;
  permanentNumber?: string;
};

type ApiConstructor = {
  constructorId: string;
  name: string;
  nationality: string;
};

type ApiMoment = {
  date: string;
  time?: string;
};

type ApiRace = {
  season: string;
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location: {
      locality: string;
      country: string;
    };
  };
  FirstPractice?: ApiMoment;
  SecondPractice?: ApiMoment;
  ThirdPractice?: ApiMoment;
  SprintQualifying?: ApiMoment;
  SprintShootout?: ApiMoment;
  Sprint?: ApiMoment;
  Qualifying?: ApiMoment;
  Results?: ApiResult[];
};

type ApiDriverStanding = {
  position: string;
  points: string;
  wins: string;
  Driver: ApiDriver;
  Constructors: ApiConstructor[];
};

type ApiConstructorStanding = {
  position: string;
  points: string;
  wins: string;
  Constructor: ApiConstructor;
};

type ApiResult = {
  position: string;
  points: string;
  grid: string;
  laps: string;
  status: string;
  Driver: ApiDriver;
  Constructor: ApiConstructor;
  Time?: { time: string };
};

type RaceResponse = {
  MRData: {
    RaceTable: {
      season?: string;
      Races: ApiRace[];
    };
  };
};

type StandingsResponse = {
  MRData: {
    StandingsTable: {
      season?: string;
      StandingsLists: Array<{
        DriverStandings?: ApiDriverStanding[];
        ConstructorStandings?: ApiConstructorStanding[];
      }>;
    };
  };
};

const parseNumber = (value: string | undefined) => Number(value ?? 0);

const toIsoDate = ({ date, time }: ApiMoment) => {
  if (!time) return null;
  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const normalizeDriver = (driver: ApiDriver): Formula1Driver => ({
  id: driver.driverId,
  code: driver.code || driver.familyName.slice(0, 3).toUpperCase(),
  givenName: driver.givenName,
  familyName: driver.familyName,
  nationality: driver.nationality,
  number: driver.permanentNumber ?? null,
});

const normalizeConstructor = (
  constructor: ApiConstructor,
): Formula1Constructor => ({
  id: constructor.constructorId,
  name: constructor.name,
  nationality: constructor.nationality,
});

const createSession = (
  id: string,
  label: string,
  kind: Formula1SessionKind,
  moment: ApiMoment | undefined,
): Formula1Session | null =>
  moment
    ? {
        id,
        label,
        kind,
        startsAt: toIsoDate(moment),
      }
    : null;

const normalizeRace = (race: ApiRace): Formula1Race => {
  const sessions = [
    createSession("practice-1", "Practice 1", "practice", race.FirstPractice),
    createSession("practice-2", "Practice 2", "practice", race.SecondPractice),
    createSession("practice-3", "Practice 3", "practice", race.ThirdPractice),
    createSession(
      "sprint-qualifying",
      "Sprint qualifying",
      "sprint-qualifying",
      race.SprintQualifying ?? race.SprintShootout,
    ),
    createSession("sprint", "Sprint", "sprint", race.Sprint),
    createSession("qualifying", "Qualifying", "qualifying", race.Qualifying),
    createSession("race", "Race", "race", {
      date: race.date,
      time: race.time,
    }),
  ].filter((session): session is Formula1Session => Boolean(session));

  return {
    season: parseNumber(race.season),
    round: parseNumber(race.round),
    name: race.raceName,
    circuit: {
      id: race.Circuit.circuitId,
      name: race.Circuit.circuitName,
      locality: race.Circuit.Location.locality,
      country: race.Circuit.Location.country,
    },
    startsAt: toIsoDate({ date: race.date, time: race.time }),
    date: race.date,
    sessions,
  };
};

const normalizeResult = (result: ApiResult): Formula1RaceResult => ({
  position: parseNumber(result.position),
  points: parseNumber(result.points),
  grid: parseNumber(result.grid),
  laps: parseNumber(result.laps),
  status: result.status,
  time: result.Time?.time ?? null,
  driver: normalizeDriver(result.Driver),
  constructor: normalizeConstructor(result.Constructor),
});

const fetchJson = async <T>(path: string, signal?: AbortSignal) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Formula 1 data request failed (${response.status})`);
  }
  return (await response.json()) as T;
};

export async function fetchFormula1Snapshot(
  signal?: AbortSignal,
): Promise<Formula1Snapshot> {
  const [calendarResponse, driversResponse, constructorsResponse, winnersResponse] =
    await Promise.all([
      fetchJson<RaceResponse>("/current.json", signal),
      fetchJson<StandingsResponse>("/current/driverstandings.json", signal),
      fetchJson<StandingsResponse>("/current/constructorstandings.json", signal),
      fetchJson<RaceResponse>("/current/results/1.json?limit=100", signal),
    ]);

  const races = calendarResponse.MRData.RaceTable.Races.map(normalizeRace);
  const season = parseNumber(
    calendarResponse.MRData.RaceTable.season ??
      calendarResponse.MRData.RaceTable.Races[0]?.season,
  );
  const driverStandings =
    driversResponse.MRData.StandingsTable.StandingsLists[0]?.DriverStandings?.map(
      (standing): Formula1DriverStanding => ({
        position: parseNumber(standing.position),
        points: parseNumber(standing.points),
        wins: parseNumber(standing.wins),
        driver: normalizeDriver(standing.Driver),
        constructors: standing.Constructors.map(normalizeConstructor),
      }),
    ) ?? [];
  const constructorStandings =
    constructorsResponse.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings?.map(
      (standing): Formula1ConstructorStanding => ({
        position: parseNumber(standing.position),
        points: parseNumber(standing.points),
        wins: parseNumber(standing.wins),
        constructor: normalizeConstructor(standing.Constructor),
      }),
    ) ?? [];
  const winnersByRound = Object.fromEntries(
    winnersResponse.MRData.RaceTable.Races.flatMap((race) => {
      const winner = race.Results?.[0];
      return winner ? [[parseNumber(race.round), normalizeResult(winner)]] : [];
    }),
  );

  return {
    season,
    races,
    driverStandings,
    constructorStandings,
    winnersByRound,
    resultsByRound: {},
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchFormula1RaceResults(
  round: number,
  signal?: AbortSignal,
) {
  const response = await fetchJson<RaceResponse>(
    `/current/${round}/results.json`,
    signal,
  );
  return response.MRData.RaceTable.Races[0]?.Results?.map(normalizeResult) ?? [];
}
