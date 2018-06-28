import React, {Component} from 'react';
import ReactDom from 'react-dom';
import SADPage from '@souche-f2e/sad';
import '../../../styles/index.less';
import RJImage from '../../../components/common/RJImage';
import {
    DealerInfoView,
} from "../../../components/dealerInfo/dealerInfoView";
import {
    AddDealer
} from "../../../components/dealerInfo/AddDealer";
import {
    EditDealer
} from "../../../components/dealerInfo/EditDealer";
import {RJAreaCascader} from '@souche-f2e/sad/components/RJAntd';
import {
    Radio,
    Button,
    Table,
    Select,
    Modal,
    Form,
    Col,
    Row,
    Input,
    DatePicker,
    notification,
    Upload,
    Icon,
    PictureInfo
} from 'antd';
import {showPayment, PercentageToFixed} from "../../../utils/functions.js";

const FormItem = Form.Item;
const Option = Select.Option;
const confirm = Modal.confirm;
const RadioGroup = Radio.Group;
const resetAreaCascader = RJAreaCascader.resetAreaCascader

class DealerFirstAudit extends SADPage {

    constructor(props) {
        super(props);
        this.state = {
            dataSource: [],
            pageSize: 10,
            current: 1,
            totalNumber: 0,
            loading: true,
            json: {},
            startValue: null,
            endValue: null,
            endOpen: false,
            addVisible: false,
            dealerDataSource: [],
            shopInfo: null,
            editVisible: false,
            editDataSource: [],
            viewVisible: false,
            isDuplicate: false,
            area: '',
            provinceCode: '',
            cityCode: '',
            districtCode: '',
            count: 0,
            editCount: 0,
            importVisible: false,
            fileList: [],
            contentEmpty:true,
        };
        this.localData = {
            columns: [
                {title: '车商编号', dataIndex: 'dealerNo', key: 'dealerNo', width: '9%'},
                {title: '车商名称', dataIndex: 'dealerName', key: 'dealerName', width: '10%'},
                {title: '联系人姓名', dataIndex: 'contactPersonName', key: 'contactPersonName', width: '8%'},
                {title: '联系方式', dataIndex: 'contactPersonMobile', key: 'legalPersonMobile', width: '9%'},
                {title: '地区', dataIndex: 'area', key: 'area', width: '8%'},
                {title: '详细地址', dataIndex: 'dealerAddress', key: 'dealerAddress', width: '8%'},
                {title: '企业支付宝账户', dataIndex: 'dealerAlipayAccount', key: 'dealerAlipayAccount', width: '11%'},
                {title: '申请时间', dataIndex: 'dateCreate', key: 'dateCreate'},
                {title: '驳回原因', dataIndex: 'description', key: 'description', width: '8%'},
                {title: '备注', dataIndex: 'remark', key: 'remark', width: '6%'},
                {
                    title: '操作',
                    key: 'op',
                    width: '10%',
                    render: (text, record) => {

                        let pageUrl = window.location.origin;

                        console.log(record.recordId);
                        let dealerId = record.dealerId;
                        let url = null;

                        let editDealerInfo = pageUrl + '/admin/dealer/dealerEdit.html?dealerId=' + dealerId;
                        let viewDealerInfo = pageUrl + '/admin/dealer/dealerView.html?dealerId=' + dealerId;

                        let _this = this;
                        //let passDealerInfoHtml = <a onClick={() => _this.passDealerInfo(dealerId)}>通过 </a>;
                        let passDealerInfoHtml = null;
                        AuthZ.init(function (e, authZ, data) {
                            if (authZ.hasResAccess("FCL-DEALER-FIRSTAUDIT-PASS")) {
                                passDealerInfoHtml = (
                                    <a onClick={() => _this.passDealerInfo(dealerId)}>通过 </a>);
                            }
                        })

                        //let editDealerInfoHtml = <a onClick={() => {_this.editDealer(dealerId)}}>修改 </a>;
                        let editDealerInfoHtml = null;
                        AuthZ.init(function (e, authZ, data) {
                            if (authZ.hasResAccess("FCL-DEALER-FIRSTAUDIT-EDIT")) {
                                editDealerInfoHtml = (
                                    <a onClick={() => {
                                        _this.editDealer(dealerId)
                                    }}>修改 </a>);
                            }
                        })

                        //let deleteDealerInfoHtml = <a onClick={() => _this.deleteDealerInfo(dealerId)}>删除 </a>;
                        let deleteDealerInfoHtml = null;
                        AuthZ.init(function (e, authZ, data) {
                            if (authZ.hasResAccess("FCL-DEALER-FIRSTAUDIT-DELETE")) {
                                deleteDealerInfoHtml = (
                                    <a onClick={() => _this.deleteDealerInfo(dealerId)}>删除 </a>);
                            }
                        })

                        //let viewDealerInfoHtml = <a onClick={() => {_this.viewDealer(dealerId)}}>查看</a>;
                        let viewDealerInfoHtml = null;
                        AuthZ.init(function (e, authZ, data) {
                            if (authZ.hasResAccess("FCL-DEALER-FIRSTAUDIT-VIEW")) {
                                viewDealerInfoHtml = (
                                    <a onClick={() => {
                                        _this.viewDealer(dealerId)
                                    }}>查看</a>);
                            }
                        })

                        url =
                            <div>{passDealerInfoHtml}{editDealerInfoHtml}{deleteDealerInfoHtml}{viewDealerInfoHtml}</div>
                        return (
                            <div className="div-operator" size="small">
                                {url}
                            </div>
                        );
                    }
                },
            ],
        };
    }

    passDealerInfo = (dealerId) => {
        let _this = this;
        let recheckAudit = 20;
        this.checkContentEmpty(dealerId).then(data => {
            if (this.state.contentEmpty == false) {
                confirm({
                    title: '审核通过',
                    width: 550,
                    content: (
                        <div>
                            <span>审核通过，同意担保！</span>
                            <div>
                                <span>备注：</span><br/>
                                <Input type="textarea" id="passRef"></Input>
                            </div>
                        </div>
                    ),
                    onOk(){
                        let description = document.getElementById("passRef").value;
                        _this.handleOkDealerInfo(dealerId, description, recheckAudit);
                        _this.redirectToList();
                    },
                    onCancel(){
                    }
                });
            } else {
                notification.error({
                    message: "失败",
                    description: "车商资料不完整，请检查。",
                    duration: 3
                });
            }
        });
    }

    redirectToList = () => {
        let pageUrl = window.location.origin;
        window.location = pageUrl + '/admin/dealer/dealerFirstAudit.html';
    }

    deleteDealerInfo = (dealerId) => {
        let _this = this;
        confirm({
            title: '确认删除',
            width: 550,
            content: '该删除操作不可恢复，您确认删除这条记录吗?',
            onOk(){
                _this.deleteDealer(dealerId).then(data => {
                    if (data.code == '200') {
                        _this.setState({
                            loading: false,
                        });
                        _this.redirectToList()
                    }
                });
            },
            onCancel(){
            }
        });
    }

    clickReset = () => {
        this.props.form.resetFields();
        resetAreaCascader();
        this.state.provinceCode = null;
        this.state.cityCode = null;
        this.state.districtCode = null;
    }

    editDealer = (dealerId) => {
        let editCount = this.state.editCount;
        this.editDealerInfo(dealerId).then(data => {
            if (data.code == '200') {
                console.log(data.data.editDataSource)
                data.data.editDataSource.flag = true;
                this.setState({
                    loading: false,
                    editDataSource: data.data.editDataSource,
                    editVisible: true,
                    editCount: editCount + 1,
                })
                ;
            }
        });
    }
    viewDealer = (dealerId) => {
        this.editDealerInfo(dealerId).then(data => {
            if (data.code == '200') {
                console.log(data.data.editDataSource)
                this.setState({
                    loading: false,
                    editDataSource: data.data.editDataSource,
                    viewVisible: true,
                })
                ;
            }
        });
    }
    //加载列表数据
    initListData = (pagination) => {
        this.state.current = pagination.current;
        this.state.pageSize = pagination.pageSize;
        this.getDealerFirstAuditListPage().then(data => {
            if (data.code == '200') {
                this.setState({
                    totalNumber: data.data.dealerFirstAuditList.totalNumber,
                    dataSource: data.data.dealerFirstAuditList.items,
                    loading: false,
                    current: this.state.current,
                    pageSize: this.state.pageSize,
                });
            }
        });
    };
    //添加车商
    addDealer = () => {
        let count = this.state.count;
        count++;
        console.log("addDealer" + count)
        this.setState({addVisible: true, count: count});
    }

    handleCancel = () => {
        this.setState({addVisible: false});
        this.redirectToList();
    }

    handleEditCancel = () => {
        this.setState({editVisible: false});
        //this.redirectToList();
    }

    handleViewCancel = () => {
        // this.getListByParam();
        this.setState({viewVisible: false});
    }

    getListByParam = () => {
        let dealerAccessQueryParam = this.props.form.getFieldsValue();
        dealerAccessQueryParam.auditStatus = 10;
        dealerAccessQueryParam.provinceCode = this.state.provinceCode;
        dealerAccessQueryParam.cityCode = this.state.cityCode;
        dealerAccessQueryParam.districtCode = this.state.districtCode;
        dealerAccessQueryParam.startValue = dealerAccessQueryParam.startValue ? dealerAccessQueryParam.startValue.format('YYYY-MM-DD') : null,
            dealerAccessQueryParam.endValue = dealerAccessQueryParam.endValue ? dealerAccessQueryParam.endValue.format('YYYY-MM-DD') : null,
            this.state.json = dealerAccessQueryParam;
        this.state.current = 1;
        console.log(this.state.json);
        this.getDealerFirstAuditListPage().then(data => {
            if (data.code == '200') {
                this.setState({
                    totalNumber: data.data.dealerFirstAuditList.totalNumber,
                    dataSource: data.data.dealerFirstAuditList.items,
                    loading: false,
                    current: this.state.current,
                    pageSize: this.state.pageSize,
                });
            }
        });
    }

    disabledStartDate = (startValue) => {
        const endValue = this.state.endValue;
        if (!startValue || !endValue) {
            return false;
        }
        return startValue.valueOf() > endValue.valueOf();
    }

    disabledEndDate = (endValue) => {
        const startValue = this.state.startValue;
        if (!endValue || !startValue) {
            return false;
        }
        return endValue.valueOf() <= startValue.valueOf();
    }

    onChange = (field, value) => {
        this.setState({
            [field]: value,
        });
    }

    onStartChange = (value) => {
        this.onChange('startValue', value);
    }

    onEndChange = (value) => {
        this.onChange('endValue', value);
    }

    handleStartOpenChange = (open) => {
        if (!open) {
            this.setState({endOpen: true});
        }
    }

    handleEndOpenChange = (open) => {
        this.setState({endOpen: open});
    }

    // areaChange = (value) => {
    //     let area = '';
    //     for(let i in value){
    //         area = area + value[i].label;
    //     }
    //     this.setState({area:area});
    // }

    onProvinceChange = (value) => {
        this.state.provinceCode = value.key;
    }

    onCityChange = (value) => {
        this.state.cityCode = value.key;
    }

    onDistrictChange = (value) => {
        this.state.districtCode = value.key;
    }

    exportDealerFirst = () => {
        this.state.json.auditStatus = 10;
        let queryParam = JSON.stringify(this.state.json);
        let url = `${SERVER_URL}/export/exportDealerFirst?queryParam=` + encodeURIComponent(queryParam);
        window.open(url);
    }
    //导入
    importDealerFirst = () => {
        let key = this.state.key;
        this.setState({
            key: key + 1,
            importVisible: true
        });
    }

    handleImportCancel = () => {
        this.setState({
            importVisible: false
        });
        this.redirectToList();
    }
    exportDealerFirstTemp = () => {
        let url = `${SERVER_URL}/export/exportDealerFirstTemp`;
        window.open(url);
    }

    render() {
        if (this.stateAlready) {
            let pagination = {
                size: 'small',
                total: this.state.totalNumber,
                current: this.state.current,
                pageSize: this.state.pageSize,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: ['10', '20', '30', '40', '50'],
                defaultPageSize: 10,
                onShowSizeChange(current, pageSize) {
                },
                onChange(current, pageSize) {
                },
                showTotal(total) {
                    return '共' + total + '条';
                }
            };
            const {getFieldDecorator} = this.props.form;
            //选择搜索前缀
            const prefixSelector = getFieldDecorator('optionPrefix', {
                initialValue: 'orderNo',
            })(
                <Select style={{width: '80px'}}>
                    <Option value="orderNo">订单ID</Option>
                    <Option value="dealerName">经销商名称</Option>
                </Select>
            );
            let _this = this;
            const props = {
                name: 'file',
                action: SERVER_URL + '/admin/dealer/dealerFirstAudit/importDealerFirstList.json',
                onChange(info) {
                    let fileList = info.fileList;
                    console.log(_this.state.uploadResult)
                    if (info.file.response && info.file.response.code == 200) {
                        // if (info.file.response.data.failInfo && info.file.response.data.failInfo.length>0) {
                        //     let  failInfo = [<p>数据导入成功</p>,
                        //         <p style={{color:'red'}}>Excel中未导入的数据信息：</p>,
                        //         <p style={{color:'red'}}>{info.file.response.data.failInfo}</p>];
                        //     notification.success({message: "成功", duration:null, onClose:(() => {location.reload();}), description: failInfo,});
                        // }else{
                        //     notification.success({message: "成功", duration:3,onClose:(() => {location.reload();}), description: "数据导入成功",});
                        // }
                        notification.success({
                            message: "成功", duration: 3, onClose: (() => {
                                location.reload();
                            }), description: "数据导入成功",
                        });
                    }
                    else if (info.file.response && info.file.response.code == 500) {
                        _this.setState({fileList: []});
                        notification.error({
                            message: "失败",
                            description: info.file.response.data.message,
                            duration: 3
                        });
                    }
                    _this.setState({fileList: fileList});
                    // fileList = fileList.filter((file) => {
                    //     if (file.response) {
                    //         return file.response.status === 'success';
                    //     }
                    //     return true;
                    // });
                },
            };

            let addDealerHtml = null;
            AuthZ.init(function (e, authZ, data) {
                if (authZ.hasResAccess("FCL-DEALER-FIRSTAUDIT-ADD")) {
                    addDealerHtml = (
                        <Button type="primary" style={{marginRight: 10}} onClick={_this.addDealer}>添加车商</Button>);
                }
            })

            //let exportDealerHtml =  <Button type="primary" style={{marginRight: 5}} onClick={_this.exportDealerFirst}>导出</Button>;
            let exportDealerHtml = null;
            AuthZ.init(function (e, authZ, data) {
                if (authZ.hasResAccess("FCL-DEALER-FIRSTAUDIT-EXPORT")) {
                    exportDealerHtml = (
                        <Button type="primary" style={{marginRight: 5}} onClick={_this.exportDealerFirst}>导出</Button>);
                }
            })

            //let importDealerHtml = <Button type="primary" style={{marginRight: 10}} onClick={_this.importDealerFirst}>导入</Button>;
            let importDealerHtml = null;
            AuthZ.init(function (e, authZ, data) {
                if (authZ.hasResAccess("FCL-DEALER-FIRSTAUDIT-IMPORT")) {
                    importDealerHtml = (
                        <Button type="primary" style={{marginRight: 10}} onClick={_this.importDealerFirst}>导入</Button>);
                }
            })


            return (
                <div>
                    <div>
                        <Form layout="inline">


                            {/*<Row style={{marginBottom: 15, marginLeft: 32}}>*/}
                            <Row>
                                <Col span={20}>
                                    <FormItem>
                                        {getFieldDecorator('dealerAddress', {})(
                                            <RJAreaCascader
                                                /**
                                                 *  数据结构
                                                 *  v = {
                                                 *      key: "01118",
                                                 *      label: "安庆"
                                                 *  }
                                                 */
                                                onProvinceChange={(v) => {
                                                    this.onProvinceChange(v)
                                                }}
                                                onCityChange={(v) => {
                                                    this.onCityChange(v)
                                                }}
                                                onDistrictChange={(v) => {
                                                    this.onDistrictChange(v)
                                                }}
                                                // onChange={(code, value) => {this.areaChange(value)}}
                                                cascaderLevel={2}
                                                allowClear={true}
                                                width={200}>


                                            </RJAreaCascader>
                                        )}
                                    </FormItem>
                                    <FormItem >
                                        {getFieldDecorator("searchKey", {})(
                                            <Input placeholder='车商编号/手机号/车商名称/联系人姓名' style={{width: 230}}></Input>
                                        )}
                                    </FormItem>
                                    <FormItem >
                                        <Button type="primary" onClick={this.getListByParam}>搜索</Button>
                                        <Button type="primary" style={{marginLeft: 5}}
                                                onClick={this.clickReset}>重置</Button>
                                    </FormItem>
                                    <div><br/></div>
                                    <FormItem>
                                        {getFieldDecorator("dateType", {})(
                                            <Select style={{width: '100px'}} placeholder="选择时间类型">
                                                <Option value="1">申请时间</Option>
                                                {/*<Option value="2">准入时间</Option>*/}
                                            </Select>
                                        )}
                                    </FormItem>
                                    <FormItem>
                                        <Col span={11}>
                                            <FormItem>
                                                {getFieldDecorator('startValue', {})(
                                                    <DatePicker
                                                        style={{minWidth: "100px"}}
                                                        disabledDate={this.disabledStartDate}
                                                        format="YYYY-MM-DD"
                                                        value={this.state.startValue}
                                                        placeholder="开始时间"
                                                        onChange={this.onStartChange}
                                                        onOpenChange={this.handleStartOpenChange}
                                                    />
                                                )}
                                            </FormItem>
                                        </Col>
                                        <Col span={2}>
                                            <span>至</span>
                                        </Col>
                                        <Col span={11}>
                                            <FormItem>
                                                {getFieldDecorator('endValue', {})(
                                                    <DatePicker
                                                        style={{minWidth: "100px"}}
                                                        disabledDate={this.disabledEndDate}
                                                        format="YYYY-MM-DD"
                                                        value={this.state.endValue}
                                                        placeholder="结束时间"
                                                        onChange={this.onEndChange}
                                                        open={this.state.endOpen}
                                                        onOpenChange={this.handleEndOpenChange}
                                                    />
                                                )}
                                            </FormItem>
                                        </Col>

                                    </FormItem>
                                </Col>

                                <Col span={4}>
                                    <FormItem style={{width: '100%', textAlign: "right"}}>
                                        {/*<Button  onClick={this.getListByParam}>搜索</Button>
                                         <Button  style={{marginLeft: 5}} onClick={this.clickReset}>重置</Button>
                                         <Button onClick={this.resetArea}>清空省份</Button>
                                         &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;*/}
                                        <Row >
                                            {addDealerHtml}
                                        </Row>

                                        <div style={{height: 12}}><br/></div>
                                        <Row style={{width: '100%'}}>
                                            {exportDealerHtml}
                                            {importDealerHtml}
                                        </Row>
                                    </FormItem>
                                </Col>
                            </Row>
                        </Form>

                        <Modal title="导入"
                               visible={this.state.importVisible}
                               onCancel={() => {
                                   this.handleImportCancel()
                               }}
                               width="700px"
                               key={this.state.key}
                               onOk={() => {
                                   this.handleImportCancel()
                               }}>
                            <div>
                                <div>
                                    <table>
                                        <tbody>
                                        <tr>
                                            <td>选择文件:</td>
                                            <td>
                                                <Upload {...props} fileList={this.state.fileList}>
                                                    <Button><Icon type="upload"/> 导入待初审车商</Button>
                                                </Upload>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>导入须知</td>
                                        </tr>
                                        <tr>
                                            <td>1、导入文件仅支持excel格式，模板<a onClick={() => {
                                                this.exportDealerFirstTemp()
                                            }}>点此下载.</a></td>
                                        </tr>
                                        <tr>
                                            <td>
                                                2、单次导入文件内容不能超过100行.
                                            </td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </Modal>
                    </div>
                    <div><br/></div>
                    <Table loading={this.state.loading}
                           size="small"
                           pagination={pagination}
                           bordered
                           columns={this.localData.columns}
                           dataSource={this.state.dataSource} c
                           onChange={this.initListData}/>
                    <AddDealer addVisible={this.state.addVisible} handleCancel={this.handleCancel} _this={this}
                               shopInfo={this.state.shopInfo} isDuplicate={this.state.isDuplicate}
                               count={this.state.count}/>
                    <EditDealer editVisible={this.state.editVisible} handleEditCancel={this.handleEditCancel}
                                _this={this} editCount={this.state.editCount}
                                shopInfo={this.state.shopInfo} editDataSource={this.state.editDataSource}/>
                    <DealerInfoView viewVisible={this.state.viewVisible} editDataSource={this.state.editDataSource}
                                    _this={this} handleViewCancel={this.handleViewCancel}
                                    dealerAuditInfoVOS={this.state.dealerAuditInfoVOS}/>
                </div>
            );
        }
        return null;
    }
}

DealerFirstAudit = Form.create()(DealerFirstAudit);
ReactDom.render(<div><DealerFirstAudit></DealerFirstAudit></div>, document.querySelector("#content"));





