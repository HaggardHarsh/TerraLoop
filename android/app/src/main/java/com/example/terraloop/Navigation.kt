package com.example.terraloop

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import com.example.terraloop.ui.community.CommunityScreen
import com.example.terraloop.ui.garage.GarageScreen
import com.example.terraloop.ui.impact.ImpactScreen
import com.example.terraloop.ui.main.MainScreen
import com.example.terraloop.ui.onboarding.OnboardingScreen
import com.example.terraloop.ui.scan.ScanScreen

@Composable
fun MainNavigation() {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("tl_prefs", Context.MODE_PRIVATE) }
    val isOnboarded = remember { prefs.getBoolean("onboarded", false) }

    val startDest = if (isOnboarded) Main else Onboarding
    val backStack = rememberNavBackStack(startDest)

    NavDisplay(
        backStack = backStack,
        onBack = { backStack.removeLastOrNull() },
        entryProvider = entryProvider {
            entry<Onboarding> {
                OnboardingScreen(
                    onComplete = {
                        prefs.edit().putBoolean("onboarded", true).apply()
                        backStack.clear()
                        backStack.add(Main)
                    }
                )
            }
            entry<Main> {
                MainScreen(
                    onNavigate = { key -> backStack.add(key) }
                )
            }
        }
    )
}
