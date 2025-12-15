def main():
    data_roads={
        "routes": [
            {
                "route": "21",
                "day_type": "Weekday",
                "crowding": {
                    "Morning": 1,
                    "Afternoon": 3,
                    "Evening": 5,
                    "Night": 1
                }
            },
            {
                "route": "14",
                "day_type": "Weekday",
                "crowding": {
                    "Morning": 2,
                    "Afternoon": 1,
                    "Evening": 5,
                    "Night": 1
                }
            }
        ]
    }
    wether_conditions = {
        "Clear": 1,
        "Rain": 5,
    }

    user_route = input("Enter the route number: ")
    user_day_type = input("Enter the day type (Weekday/Weekend): ")
    user_time_of_day = input("Enter the time of day (Morning/Afternoon/Evening/Night): ")
    user_weather = input("Enter the weather condition (Clear/Rain): ")

    crowding_level = data_roads["routes"][0]["crowding"].get(user_time_of_day, 0) * wether_conditions.get(user_weather, 1)
    print(crowding_level)
    
main()