export class Utils {
  static waitForTimeout(time) {
    return new Promise((resolve) => setTimeout(resolve, time))
  }
}
