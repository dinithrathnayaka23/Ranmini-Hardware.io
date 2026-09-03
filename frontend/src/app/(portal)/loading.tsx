import { PortalPageSkeleton } from "@/shared/components/layout/skeleton";

/**
 * What the portal shows while a screen's data is being fetched.
 *
 * <p>Before this existed, clicking a sidebar row did nothing visible until the
 * server had finished every query and rendered the whole page. The browser sat
 * on the old screen with no acknowledgement, which is the single thing that
 * made the portal feel slow — the wait was real but it was also completely
 * unsignalled.
 *
 * <p>Because the shell is a layout, it stays mounted across in-app navigation:
 * the rail and the top bar do not re-render, the content region swaps to this
 * immediately, and React streams the real screen in when it is ready.
 *
 * <p>One file covers every screen in the group. Per-route skeletons would trace
 * each layout more closely, but they would also be a dozen more files to keep
 * in step with the screens they imitate, and the point here is to acknowledge
 * the click and reserve the space — not to draw the page twice.
 */
export default function PortalLoading() {
  return <PortalPageSkeleton />;
}
