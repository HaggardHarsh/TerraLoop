package com.example.terraloop.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val TerraLoopDarkColorScheme = darkColorScheme(
    primary = Emerald,
    secondary = Cyan,
    tertiary = Teal,
    background = BgBase,
    surface = BgElevated,
    surfaceVariant = BgSurface,
    onPrimary = BgVoid,
    onSecondary = BgVoid,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    onSurfaceVariant = TextSecondary,
    outline = GlassBorder,
    error = Rose,
)

@Composable
fun TerraLoopTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = TerraLoopDarkColorScheme,
        typography = Typography,
        content = content
    )
}
