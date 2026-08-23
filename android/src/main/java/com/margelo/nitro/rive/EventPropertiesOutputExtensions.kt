package com.margelo.nitro.rive

object EventPropertiesOutputExtensions {
  fun boolean(value: Boolean): EventPropertiesOutput =
    EventPropertiesOutput.First(value)

  fun string(value: String): EventPropertiesOutput =
    EventPropertiesOutput.Third(value)

  fun number(value: Double): EventPropertiesOutput =
    EventPropertiesOutput.Second(value)
}
