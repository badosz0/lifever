import { Flag, Heart, Trophy, Users } from "lucide-react";

import {
  SettingsGroup,
  SettingsModal,
  SettingsRow,
  SettingsSection,
  type SettingsDialogProps,
} from "@/components/settings/settings-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormula1 } from "@/features/formula1/model/formula1-provider";

export function Formula1SettingsDialog({
  open,
  onOpenChange,
}: SettingsDialogProps) {
  const {
    favoriteConstructorId,
    favoriteDriverId,
    setFavoriteConstructorId,
    setFavoriteDriverId,
    snapshot,
    loading,
  } = useFormula1();
  return (
    <SettingsModal
      open={open}
      onOpenChange={onOpenChange}
      title="Formula 1 settings"
      description="Follow the people and teams you’re cheering for."
      icon={Flag}
      iconClassName="bg-red-500/10 text-red-600 dark:text-red-400"
      pages={[
        {
          id: "favorites",
          label: "Favorites",
          icon: Heart,
          description:
            "Keep your favorite driver and team easy to spot in the standings.",
          content: (
            <SettingsSection
              title="Your picks"
              description={
                loading
                  ? "Loading this season’s drivers and teams…"
                  : !snapshot
                    ? "Driver and team choices will appear when race data is available."
                    : `Choose from the ${snapshot.season} championship.`
              }
            >
              <SettingsGroup>
                <SettingsRow
                  title="Favorite driver"
                  description={
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-3.5" />
                      Highlighted in driver standings
                    </span>
                  }
                  controlId="formula1-favorite-driver"
                >
                  <Select
                    value={favoriteDriverId ?? "none"}
                    onValueChange={(value) =>
                      setFavoriteDriverId(value === "none" ? null : value)
                    }
                    disabled={!snapshot?.driverStandings.length}
                  >
                    <SelectTrigger id="formula1-favorite-driver">
                      <SelectValue placeholder="Choose a driver" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No favorite</SelectItem>
                      {snapshot?.driverStandings.map(({ driver }) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.givenName} {driver.familyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SettingsRow>
                <SettingsRow
                  title="Favorite team"
                  description={
                    <span className="inline-flex items-center gap-1.5">
                      <Trophy className="size-3.5" />
                      Highlighted in team standings
                    </span>
                  }
                  controlId="formula1-favorite-team"
                >
                  <Select
                    value={favoriteConstructorId ?? "none"}
                    onValueChange={(value) =>
                      setFavoriteConstructorId(value === "none" ? null : value)
                    }
                    disabled={!snapshot?.constructorStandings.length}
                  >
                    <SelectTrigger id="formula1-favorite-team">
                      <SelectValue placeholder="Choose a team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No favorite</SelectItem>
                      {snapshot?.constructorStandings.map(({ constructor }) => (
                        <SelectItem key={constructor.id} value={constructor.id}>
                          {constructor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SettingsRow>
              </SettingsGroup>
            </SettingsSection>
          ),
        },
      ]}
    />
  );
}
