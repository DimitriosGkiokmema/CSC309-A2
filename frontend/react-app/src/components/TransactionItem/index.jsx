import "./style.css";

function TransactionItem({ id, utorid, amount, type, spent, remark }) {

    return (
    <div className="transaction-item row">
        <div className="col userInfo">
            <p>Transaction {id}</p>
            <p><strong>{utorid}</strong></p>
        </div>
        <div className="col-4 transInfo">
            <div>
                <p>Type:</p>
                <p>{type}</p>
            </div>
            <div>
                <p>Amount:</p>
                <p>{amount}</p>
            </div>
            <div>
                <p>Spent:</p>
                <p><i className="fa-solid fa-dollar-sign"></i>{spent}</p>
            </div>
            {remark !== "" && (
                <div>
                    <p>Remark:</p>
                    <p>{remark}</p>
                </div>
            )}
        </div>
    </div>
  )
}

export default TransactionItem;