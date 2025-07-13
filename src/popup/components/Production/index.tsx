import 'antd/lib/select/style/index.css'
import 'antd/lib/slider/style/index.css'
import 'antd/lib/input/style/index.css'
import 'antd/lib/switch/style/index.css'

import Input from 'antd/lib/input'
import Select from 'antd/lib/select'
import Slider from 'antd/lib/slider'
import Switch from 'antd/lib/switch'
import React from 'react'
import { useSelector, useDispatch } from 'react-redux'

import { setFilterStrictness } from '../../redux/actions/settings'
import {
  setTrainedModel,
  setFilterEffect,
  setWebsiteList,
  setTopKPredictions,
  toggleShowProbabilityOverlay,
  setClassThreshold
} from '../../redux/actions/settings/index'
import { RootState } from '../../redux/reducers'
import { SettingsState } from '../../redux/reducers/settings'
import { StatisticsState } from '../../redux/reducers/statistics'

import { Container, Stats, DropdownRow, TextBox } from './styles'

const { Option } = Select
export const Production: React.FC = () => {
  const dispatch = useDispatch()
  const {
    filterStrictness,
    trainedModel,
    filterEffect,
    websites,
    topKPredictions,
    showProbabilityOverlay,
    classThresholds
  } = useSelector<RootState>((state) => state.settings) as SettingsState
  const { totalBlocked } = useSelector<RootState>((state) => state.statistics) as StatisticsState

  return (
    <Container>
      <Stats>
        <span>Total blocked: {totalBlocked}</span>
      </Stats>

      <div>Filter thresholds (higher = more strict)</div>
      
      {Object.entries(classThresholds).map(([className, threshold]) => (
        <div key={className} style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '14px', marginBottom: '4px' }}>
            {className}: {Math.round(threshold * 100)}%
          </div>
          <Slider
            min={0}
            max={100}
            onChange={(value: number) => dispatch(setClassThreshold(className, value / 100))}
            value={Math.round(threshold * 100)}
            tipFormatter={(value) => `${value}%`}
          />
        </div>
      ))}

      <div style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
        💡 Tip: Lower thresholds = more blocking, Higher thresholds = less blocking
      </div>

      <DropdownRow>
        <span>Filter effect</span>
        <Select
          defaultValue={filterEffect}
          style={{ width: 140 }}
          onChange={value => dispatch(setFilterEffect(value))}
        >
          <Option value="hide">Hide</Option>
          <Option value="blur">Blur</Option>
          <Option value="grayscale">Grayscale</Option>
        </Select>
      </DropdownRow>

      <DropdownRow>
        <span>Trained model</span>
        <Select
          defaultValue={trainedModel}
          style={{ width: 140 }}
          onChange={value => dispatch(setTrainedModel(value))}
        >
          <Option value="MobileNetV2">MobileNetV2</Option>
          <Option value="MobileNetV2Mid">MobileNetV2Mid</Option>
          <Option value="InceptionV3">InceptionV3</Option>
        </Select>
      </DropdownRow>

      <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
        Note: The new model will be loaded automatically when you close this popup.
        <br />
        To compare models, enable logging in browser and visit extension's background page.
      </div>

      <DropdownRow>
        <span>Top K predictions</span>
        <Select
          defaultValue={topKPredictions}
          style={{ width: 140 }}
          onChange={value => dispatch(setTopKPredictions(value))}
        >
          <Option value={2}>2</Option>
          <Option value={3}>3</Option>
          <Option value={5}>5</Option>
        </Select>
      </DropdownRow>

      <DropdownRow>
        <span>Show prediction overlay</span>
        <Switch
          checked={showProbabilityOverlay}
          onChange={() => dispatch(toggleShowProbabilityOverlay())}
          size="small"
        />
      </DropdownRow>

      <div>Whitelisted websites</div>
      <TextBox>
        <Input
          placeholder="www.twitter.com, www.facebook.com"
          defaultValue={websites.join(', ')}
          onChange={event => {
            // Handle the change event and update the whitelist
            const websites = event.target.value.split(/\s*,\s*/)
            dispatch(setWebsiteList(websites))
            // Update the whitelist/blacklist using the websites array
          }}
        />
      </TextBox>

    </Container>
  )
}
