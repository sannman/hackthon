def main():
    
    user_amount = float(input("Enter the amount spent: "))
    user_amount_where_spent = input("Enter where the amount was spent: ")


    #will use a db and store past data to calculate
    weekly_avg = 0
    time_stamp_of_purchase = ""
    time_stamp_of_purchase_last = ""



    spending_categories = {
        "Food":["restaurant", "cafe", "zomato","swiggy"],
        "Transport":["bus","train","rickshaw","auto","uber","ola"],
        "Entertainment":["movie","concert","theatre","netflix","spotify","apple music"],
        "Shopping":["mall","store","amazon","flipkart"],
        "Bills":["electricity","water","internet","phone"],
        "Other":["other"," "]
    }

    if user_amount >= weekly_avg:
        print("Might be a Scam Transaction, Please Verify")
    
