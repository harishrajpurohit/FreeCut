import { ACTIONS } from "./definitions";
import type {
	TAction,
	TActionWithArgs,
	TActionWithOptionalArgs,
} from "./types";

/**
 * Actions whose argument is required, so they cannot be bound to a shortcut
 * (a key press carries no arguments). Everything else in `ACTIONS`, including
 * actions with an optional argument, is bindable.
 */
const ACTIONS_WITH_REQUIRED_ARGS = [
	"remove-media-asset",
	"remove-media-assets",
] as const satisfies readonly TActionWithArgs[];

// Compile-time guard: fails if a new action with a required argument is added
// to `TActionArgsMap` without being listed above.
type MissingRequiredArgActions = Exclude<
	Exclude<TActionWithArgs, TActionWithOptionalArgs>,
	(typeof ACTIONS_WITH_REQUIRED_ARGS)[number]
>;
const requiredArgActionsAreExhaustive: [MissingRequiredArgActions] extends [
	never,
]
	? true
	: never = true;
void requiredArgActionsAreExhaustive;

const REQUIRED_ARG_ACTION_SET: ReadonlySet<string> = new Set(
	ACTIONS_WITH_REQUIRED_ARGS,
);

export function isAction(value: unknown): value is TAction {
	return typeof value === "string" && Object.hasOwn(ACTIONS, value);
}

/** True for any action that can be bound to a shortcut (needs no required argument). */
export function isActionWithOptionalArgs(
	value: unknown,
): value is TActionWithOptionalArgs {
	return isAction(value) && !REQUIRED_ARG_ACTION_SET.has(value);
}
