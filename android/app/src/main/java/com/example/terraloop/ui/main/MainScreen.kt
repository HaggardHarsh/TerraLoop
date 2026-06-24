package com.example.terraloop.ui.main

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.example.terraloop.theme.*
import com.example.terraloop.ui.community.CommunityScreen
import com.example.terraloop.ui.garage.GarageScreen
import com.example.terraloop.ui.impact.ImpactScreen
import com.example.terraloop.ui.scan.ScanScreen

private enum class Tab(val label: String, val icon: String) {
    SCAN("Scan", "🔍"),
    GARAGE("Garage", "🗄️"),
    COMMUNITY("Community", "🌱"),
    IMPACT("Impact", "🌍")
}

@Composable
fun MainScreen(onNavigate: (Any) -> Unit = {}) {
    var selectedTab by remember { mutableStateOf(Tab.SCAN) }

    Scaffold(
        containerColor = BgBase,
        bottomBar = {
            NavigationBar(
                containerColor = BgElevated,
                tonalElevation = 0.dp,
                modifier = Modifier.height(64.dp)
            ) {
                Tab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = {
                            Text(tab.icon, style = MaterialTheme.typography.titleMedium)
                        },
                        label = {
                            Text(
                                tab.label,
                                style = MaterialTheme.typography.labelSmall
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Emerald,
                            selectedTextColor = Emerald,
                            unselectedIconColor = TextMuted,
                            unselectedTextColor = TextMuted,
                            indicatorColor = Color(0x1A10B981)
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(BgBase)
        ) {
            when (selectedTab) {
                Tab.SCAN       -> ScanScreen()
                Tab.GARAGE     -> GarageScreen()
                Tab.COMMUNITY  -> CommunityScreen()
                Tab.IMPACT     -> ImpactScreen()
            }
        }
    }
}
