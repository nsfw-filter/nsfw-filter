import { Checkbox, Segmented, Select, Slider, Switch } from 'antd'
import { ChevronDown, ChevronUp, Contrast, Droplet, EyeOff } from 'lucide-react'
import React, { useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import { TRAINED_MODELS, TRAINED_MODEL_LABELS, TrainedModel } from '../../../utils/models'
import { setFilterStrictness, setVideoStrictness } from '../../redux/actions/settings'
import {
  setTrainedModel,
  setFilterEffect,
  toggleEnabled,
  toggleLogging
} from '../../redux/actions/settings/index'
import { RootState } from '../../redux/reducers'
import { SettingsState } from '../../redux/reducers/settings'
import { StatisticsState } from '../../redux/reducers/statistics'

import { AllowSiteField } from './AllowSiteField'
import {
  Container,
  Stat,
  StatNumber,
  StatCaption,
  PowerRow,
  PowerText,
  PowerTitle,
  PowerHint,
  Card,
  Field,
  EffectField,
  FieldHead,
  FieldLabel,
  FieldValue,
  SliderEnds,
  ManageLink,
  AdvancedToggle,
  AdvancedPanel,
  AdvancedRow
} from './styles'

export const Production: React.FC = () => {
  const pointerInteraction = useRef(false)
  const clearPointerFocus = (): void => {
    // The slider refocuses its handle after dragging; wait for that update.
    requestAnimationFrame(() => {
      const handle = document.activeElement
      if (pointerInteraction.current && handle instanceof HTMLElement && handle.matches('.ant-slider-handle')) {
        handle.blur()
      }
    })
  }
  const dispatch = useDispatch()
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const {
    enabled,
    filterStrictness,
    videoStrictness,
    trainedModel,
    filterEffect,
    logging
  } = useSelector<RootState>((state) => state.settings) as SettingsState
  const { totalBlocked } = useSelector<RootState>((state) => state.statistics) as StatisticsState

  return (
    <Container>
      <Stat>
        <StatNumber>{totalBlocked.toLocaleString()}</StatNumber>
        <StatCaption>images blocked</StatCaption>
      </Stat>

      <PowerRow>
        <PowerText>
          <PowerTitle>Protection</PowerTitle>
          <PowerHint>{enabled ? 'On' : 'Paused'}</PowerHint>
        </PowerText>
        <Switch checked={enabled} onChange={() => dispatch(toggleEnabled())} />
      </PowerRow>

      <Card>
        {[
          { label: 'Image strictness', value: filterStrictness, action: setFilterStrictness },
          { label: 'Video strictness', value: videoStrictness, action: setVideoStrictness }
        ].map(({ label, value, action }) => (
          <Field
            key={label}
            onPointerDownCapture={() => { pointerInteraction.current = true }}
            onKeyDownCapture={() => { pointerInteraction.current = false }}
          >
            <FieldHead>
              <FieldLabel>{label}</FieldLabel>
              <FieldValue>{value}%</FieldValue>
            </FieldHead>
            <Slider
              min={1}
              max={100}
              value={value}
              ariaLabelForHandle={label}
              tooltip={{ open: false }}
              onChange={(value: number) => dispatch(action(value))}
              onChangeComplete={clearPointerFocus}
            />
            <SliderEnds>
              <span>Lenient</span>
              <span>Strict</span>
            </SliderEnds>
          </Field>
        ))}

        <EffectField>
          <FieldLabel>Filter effect</FieldLabel>
          <Segmented<'blur' | 'grayscale' | 'hide'>
            block
            style={{ marginTop: 8 }}
            value={filterEffect}
            onChange={value => dispatch(setFilterEffect(value))}
            options={[
              { label: 'Blur', value: 'blur', icon: <Droplet size={14} /> },
              { label: 'Gray', value: 'grayscale', icon: <Contrast size={14} /> },
              { label: 'Hide', value: 'hide', icon: <EyeOff size={14} /> }
            ]}
          />
        </EffectField>

        <AllowSiteField />
        <ManageLink onClick={() => chrome.runtime.openOptionsPage()}>
          Manage allowed sites
        </ManageLink>
      </Card>

      <div>
        <AdvancedToggle
          aria-expanded={advancedOpen}
          aria-controls="advanced-panel"
          onClick={() => setAdvancedOpen(open => !open)}
        >
          {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Advanced
        </AdvancedToggle>
        {advancedOpen && (
          <AdvancedPanel id="advanced-panel">
            <AdvancedRow>
              <FieldLabel>Trained model</FieldLabel>
              <Select<TrainedModel>
                value={trainedModel}
                style={{ width: 170 }}
                onChange={value => dispatch(setTrainedModel(value))}
                options={TRAINED_MODELS.map(value => ({ value, label: TRAINED_MODEL_LABELS[value] }))}
              />
            </AdvancedRow>
            <Checkbox checked={logging} onChange={() => dispatch(toggleLogging())}>
              Show logs in browser console
            </Checkbox>
          </AdvancedPanel>
        )}
      </div>
    </Container>
  )
}
