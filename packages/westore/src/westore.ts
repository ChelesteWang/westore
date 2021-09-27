import rfdc from 'rfdc'
const clone = rfdc()

enum DataTypes {
  ARRAYTYPE = '[object Array]',
  OBJECTTYPE = '[object Object]',
  FUNCTIONTYPE = '[object Function]'
}

const ARRAYTYPE = DataTypes.ARRAYTYPE
const OBJECTTYPE = DataTypes.OBJECTTYPE
const FUNCTIONTYPE = DataTypes.FUNCTIONTYPE

export function diffData(current: any, previous: any): any {
  const result = {}
  if (!previous) return current
  syncKeys(current, previous)
  _diff(current, previous, '', result)
  return result
}

function syncKeys(current: any, previous: any) {
  if (current === previous) return

  const rootCurrentType: DataTypes = getType(current)
  const rootPreType: DataTypes = getType(previous)

  if (rootCurrentType == OBJECTTYPE && rootPreType == OBJECTTYPE) {
    for (let key in previous) {
      const currentValue = current[key]
      if (currentValue === undefined) {
        current[key] = null
      } else {
        syncKeys(currentValue, previous[key])
      }
    }
  } else if (rootCurrentType == ARRAYTYPE && rootPreType == ARRAYTYPE) {
    if (current.length >= previous.length) {
      previous.forEach((item: any, index: string | number) => {
        syncKeys(current[index], item)
      })
    }
  }
}

function setResult(result: { [x: string]: any }, k: string, v: any) {
  if (getType(v) != FUNCTIONTYPE) {
    result[k] = v
  }
}

function _diff(current: any, previous: any, path: string, result: any) {
  if (current === previous) return

  const rootCurrentType = getType(current)
  const rootPreType = getType(previous)

  if (rootCurrentType == OBJECTTYPE) {
    if (
      rootPreType != OBJECTTYPE ||
      (Object.keys(current).length < Object.keys(previous).length &&
        path !== '')
    ) {
      setResult(result, path, current)
    } else {
      for (let key in current) {
        const currentValue = current[key]
        const preValue = previous[key]
        const currentType = getType(currentValue)
        const preType = getType(preValue)
        if (currentType != ARRAYTYPE && currentType != OBJECTTYPE) {
          if (currentValue !== previous[key]) {
            setResult(result, concatPathAndKey(path, key), currentValue)
          }
        } else if (currentType == ARRAYTYPE) {
          if (preType != ARRAYTYPE) {
            setResult(result, concatPathAndKey(path, key), currentValue)
          } else {
            if (currentValue.length < preValue.length) {
              setResult(result, concatPathAndKey(path, key), currentValue)
            } else {
              currentValue.forEach((item: any, index: string) => {
                _diff(
                  item,
                  preValue[index],
                  concatPathAndKey(path, key) + '[' + index + ']',
                  result
                )
              })
            }
          }
        } else if (currentType == OBJECTTYPE) {
          if (
            preType != OBJECTTYPE ||
            Object.keys(currentValue).length < Object.keys(preValue).length
          ) {
            setResult(result, concatPathAndKey(path, key), currentValue)
          } else {
            for (let subKey in currentValue) {
              const realPath =
                concatPathAndKey(path, key) +
                (subKey.includes('.') ? `["${subKey}"]` : `.${subKey}`)
              _diff(currentValue[subKey], preValue[subKey], realPath, result)
            }
          }
        }
      }
    }
  } else if (rootCurrentType == ARRAYTYPE) {
    if (rootPreType != ARRAYTYPE) {
      setResult(result, path, current)
    } else {
      if (current.length < previous.length) {
        setResult(result, path, current)
      } else {
        current.forEach((item: any, index: any) => {
          _diff(item, previous[index], path + '[' + index + ']', result)
        })
      }
    }
  } else {
    setResult(result, path, current)
  }
}

function concatPathAndKey(path: string, key: string | string[]) {
  return key.includes('.')
    ? path + `["${key}"]`
    : (path == '' ? '' : path + '.') + key
}

function getType(obj: any) {
  return Object.prototype.toString.call(obj)
}

export function update(
  view: {
    data: any
    _westorePrevData: any
    setData: (arg0: any, arg1: any) => void
  },
  callback?: any
): any {
  const patch = diffData(view.data, view._westorePrevData)
  view.setData(patch, callback)
  view._westorePrevData = clone(view.data)
}

export class Store {
  views: any
  data: any
  private _westoreViewId: number

  constructor() {
    this.views = {}
    this._westoreViewId = 0
  }

  bind(keyOrView, view: { data: any }) {
    if (arguments.length === 1) {
      this.data = keyOrView.data
      this.views[this._westoreViewId++] = keyOrView
    } else {
      //设置回 view 的 data，不然引用地址 错误
      this.data = view.data
      this.views[keyOrView] = view
    }
  }
  update(viewKey: string | number) {
    if (arguments.length === 1) {
      update(this.views[viewKey])
    } else {
      for (const key in this.views) {
        update(this.views[key])
      }
    }
  }
}