# Idle Forge Android

This repo now includes a native Android idle game scaffold in `android/` using Kotlin + Jetpack Compose.

## Current Android Features

- manual tap income
- passive building production
- upgrade system with scaling costs
- persistent save (SharedPreferences)
- offline progress catch-up on app launch

## Open In Android Studio

1. Open Android Studio.
2. Choose `Open` and select the `android/` folder.
3. Wait for Gradle sync.
4. Run on emulator or device.

## Project Structure

- `android/app/src/main/java/com/prebenjor/idleforge/MainActivity.kt`
- `android/app/src/main/java/com/prebenjor/idleforge/game/GameModels.kt`
- `android/app/src/main/java/com/prebenjor/idleforge/game/GameViewModel.kt`
- `android/app/src/main/java/com/prebenjor/idleforge/game/GameStorage.kt`
