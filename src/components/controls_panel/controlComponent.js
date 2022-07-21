import React, {useState} from 'react';
import Plot from 'react-plotly.js';
import Select from 'react-select'
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import localforage from 'localforage';

import { useFlowChartState } from '../../hooks/useFlowChartState';
import styledPlotLayout from './../defaultPlotLayout';
import customDropdownStyles from './customDropdownStyles.tsx';

import {FUNCTION_PARAMETERS} from './../flow_chart_panel/PARAMETERS_MANIFEST'
import { ControlNames, ControlTypes, InputControlsManifest } from './CONTROLS_MANIFEST';
import { Basic } from 'react-dial-knob'

localforage.config({name: 'react-flow', storeName: 'flows'});

const flowKey = 'flow-joy';

const ControlComponent = ({ ctrlObj, theme, results, updateCtrlValue, attachParam2Ctrl }) => {
    const [flowChartObject, setFlowChartObject] = useState({});
    const {elements} = useFlowChartState();
    const [valueKnob, setValueKnob] = useState(0)


    const styledLayout = styledPlotLayout(theme);

    if(Object.keys(flowChartObject).length === 0) {
      localforage.getItem(flowKey)
          .then(val => {
            // console.log('Retrieved flow chart from local storage', val);           
            setFlowChartObject(val);})
          .catch(err => {console.warn(err);});
    }

    let options = [];

    if (ctrlObj.type === ControlTypes.Input) {
      if(flowChartObject.elements !== undefined) {
        flowChartObject.elements.map(node => {
          if ('source' in node === false) { // Object is a node, not an edge
            const nodeFunctionName = node.data.label;
            const params = FUNCTION_PARAMETERS[nodeFunctionName];
            const sep = ' ▶ ';
            if(params){
              Object.keys(params).map(param => {
                  options.push({
                      label: nodeFunctionName + sep + param.toUpperCase(),
                      value: {
                        id: nodeFunctionName + '_' + param.toUpperCase(),
                        functionName: nodeFunctionName,
                        param,
                        nodeId: node.id,
                        inputId: ctrlObj.id,
                      }
                  });
              });
            }
          }
        });
      }
    } else if (ctrlObj.type === ControlTypes.Output) {
      // console.log('output', flowChartObject);
      if(flowChartObject.elements !== undefined) {
        flowChartObject.elements.map(node => {
          if ('source' in node === false) { // Object is a node, not an edge
            let label = 'Visualize node: ' + node.data.label + ' (#' + node.id.slice(-5) + ')';
            options.push({label: label, value: node.id});
          }
        });
      }
    }

    let plotData = [{x: [1,2,3], y:[1,2,3]}];
    let nd = {};

    if (ctrlObj.name.toUpperCase() === ControlNames.Plot ) {
      // figure out what we're visualizing
      let nodeIdToPlot = ctrlObj.param;
      if (!!nodeIdToPlot) {       
        if (results && 'io' in results) {
          const runResults = JSON.parse(results.io).reverse();
          const filteredResult = runResults.filter(node => (nodeIdToPlot === node.id))[0];
          console.log('filteredResult:', filteredResult);
          nd = filteredResult === undefined ? {} : filteredResult;
          if(Object.keys(nd).length > 0) {
            plotData = nd.result && 'data' in nd.result
              ? nd.result.data
              : [{'x': nd.result['x0'], 'y': nd.result['y0'] }];
          }
        }
      }
    }

    const inputNodeId = ctrlObj?.param?.nodeId;
    const inputNode = elements.find((e) => e.id === inputNodeId);
    const ctrls = inputNode?.data?.ctrls;
    const fnParams = FUNCTION_PARAMETERS[ctrlObj?.param?.functionName] || {};
    const fnParam = fnParams[ctrlObj?.param?.param];
    const defaultValue = fnParam?.default || 0;
    const paramOptions = fnParam?.options?.map(option => {
      return {
        label: option,
        value: option,
      }
    }) || [];
    console.log('param options:', paramOptions);
    
    let currentInputValue = ctrls ? ctrls[ctrlObj?.param?.id]?.value : defaultValue;

    return (
        <div>
            <Select 
                className = 'select-node'
                isSearchable = {true}
                onChange = {val => {attachParam2Ctrl(val.value, ctrlObj)}}
                options = {options}
                styles={customDropdownStyles}
                theme={theme}
                value={options?.find(option => option.value.id === ctrlObj?.param?.id)}
            />

            {ctrlObj.name === ControlNames.Plot && (
                <div>
                    <Plot
                        data = {plotData}
                        layout = {styledLayout}
                        autosize = {true}
                        style = {{width: '100%', height: '100%'}}
                    />                    
                </div>
            )}

            {ctrlObj.name === ControlNames.NumericInput && (
                <div style={{margin: '30px 0'}}>
                    <input 
                        type='number'
                        placeholder='Enter a number'
                        className='ctrl-numeric-input'
                        onChange = {e => {updateCtrlValue(e.target.value, ctrlObj)}}
                        value={currentInputValue || 0}
                    />
                </div>
            )}

            {ctrlObj.name === ControlNames.StaticNumericInput && (
                <div style={{margin: '30px 0'}}>
                    <input 
                        type='number'
                        placeholder='Enter a number'
                        className='ctrl-numeric-input'
                        onChange = {e => {updateCtrlValue(e.target.value, ctrlObj)}}
                        disabled
                        value={currentInputValue || 0}
                    />
                </div>
            )}

            {ctrlObj.name === ControlNames.Knob && (
                <div style={{marginTop: '20px', display: 'flex', justifyContent: 'center'}}>
                  <Basic
                      style={{width: 'fit-content'}}
                      diameter={70} 
                      min={0}
                      max={100}
                      step={1}
                      value={currentInputValue || 0}
                      // value={valueKnob}
                      theme={{
                          donutColor: 'blue'
                      }}
                      onValueChange={(val) => updateCtrlValue(val, ctrlObj)}
                      // onValueChange={setValueKnob}
                      ariaLabelledBy={'my-label'}
                  >
                      {/* <label id={'my-label'}>Some slabel</label> */}
                  </Basic>
                </div>
            )}
            
            {ctrlObj.name === ControlNames.Slider && (
                <div style={{margin: '40px 10px'}}>
                  <Slider 
                    onChange = {val => {updateCtrlValue(val, ctrlObj)}}
                    value={currentInputValue || 0}
                  />
                  <label>{currentInputValue || null}</label>
                </div>
            )}
            
            {ctrlObj.name === ControlNames.Dropdown && (
                <div style={{margin: '40px 10px'}}>
                  <Select 
                      className = 'select-node'
                      isSearchable = {true}
                      onChange = {val => {updateCtrlValue(val.value, ctrlObj)}}
                      options = {paramOptions}
                      styles={customDropdownStyles}
                      theme={theme}
                      value={paramOptions.find(opt => opt.value === currentInputValue) || ''}
                  />
                </div>
            )}
            
            {ctrlObj.name === ControlNames.CheckboxButtonGroup && (
                <div style={{margin: '40px 10px'}}>
                  {paramOptions.map(option => {
                    console.log('option:', option);
                    return (
                      <>
                        <input
                          type = "checkbox"
                          id = {`${ctrlObj.id}_${option.value}`}
                          name = {`${ctrlObj.id}_${option.value}`}
                          value = {option.value}
                          checked = {currentInputValue === option.value}
                          onChange = {e => {updateCtrlValue(option.value, ctrlObj)}}
                        />
                        <label for = {`${ctrlObj.id}_${option.value}`}> {option.label} </label>
                      </>
                    )
                  })}

                </div>
            )}
            
            {ctrlObj.name === ControlNames.RadioButtonGroup && (
                <div style={{margin: '40px 10px'}}>
                  {paramOptions.map(option => {
                    console.log('option:', option);
                    return (
                      <>
                        <input
                          type = "radio"
                          id = {`${ctrlObj.id}_${option.value}`}
                          name = {`${ctrlObj.id}_${option.value}`}
                          value = {option.value}
                          checked = {currentInputValue === option.value}
                          onChange = {e => {updateCtrlValue(option.value, ctrlObj)}}
                        />
                        <label for = {`${ctrlObj.id}_${option.value}`}> {option.label} </label>
                      </>
                    )
                  })}

                </div>
            )}
            

            <details className='ctrl-meta'>           
            {`Name: ${ctrlObj.name}`}
            <br></br>
            {`ID: ${ctrlObj.id}`}
            </details>  
        </div>
    );
};

export default ControlComponent;
